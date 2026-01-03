use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, Burn, MintTo};

declare_id!("EKsqNnGARaCvDNFpLiS9NhprxZrMuPwCjXUzuMSQfQiM");

// ============================================
// WAYFIND BURN-AND-MINT TOKEN PROGRAM
// - 75% of tokens burned for credits
// - 25% added to remint pool
// - Weekly distribution to creators
// ============================================

pub const BURN_RATIO: u64 = 75; // 75%
pub const REMINT_RATIO: u64 = 25; // 25%
pub const WEEKLY_REMINT_CAP: u64 = 500_000_000_000; // 500k tokens (6 decimals)

#[program]
pub mod wayfind {
    use super::*;

    /// Initialize the protocol with token mint and config
    pub fn initialize(
        ctx: Context<Initialize>,
        weekly_cap: u64,
    ) -> Result<()> {
        let config = &mut ctx.accounts.config;
        config.authority = ctx.accounts.authority.key();
        config.token_mint = ctx.accounts.token_mint.key();
        config.treasury = ctx.accounts.treasury.key();
        config.remint_pool = 0;
        config.weekly_cap = weekly_cap;
        config.current_epoch = 0;
        config.epoch_start = Clock::get()?.unix_timestamp;
        config.total_burned = 0;
        config.total_reminted = 0;
        config.bump = ctx.bumps.config;
        
        msg!("Wayfind protocol initialized");
        Ok(())
    }

    /// Burn tokens to purchase navigation credits
    /// 75% destroyed, 25% to remint pool
    pub fn burn_for_credits(
        ctx: Context<BurnForCredits>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, WayfindError::InvalidAmount);

        let burn_amount = amount * BURN_RATIO / 100;
        let remint_amount = amount * REMINT_RATIO / 100;
        let credits = amount; // 1:1 token to credit ratio

        // Burn 75%
        let burn_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.token_mint.to_account_info(),
                from: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::burn(burn_ctx, burn_amount)?;

        // Transfer 25% to treasury (remint pool)
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, remint_amount)?;

        // Update config
        let config = &mut ctx.accounts.config;
        config.remint_pool = config.remint_pool.checked_add(remint_amount)
            .ok_or(WayfindError::Overflow)?;
        config.total_burned = config.total_burned.checked_add(burn_amount)
            .ok_or(WayfindError::Overflow)?;

        // Create or update user credit account
        let user_credits = &mut ctx.accounts.user_credits;
        user_credits.user = ctx.accounts.user.key();
        user_credits.credits = user_credits.credits.checked_add(credits)
            .ok_or(WayfindError::Overflow)?;
        user_credits.total_burned = user_credits.total_burned.checked_add(amount)
            .ok_or(WayfindError::Overflow)?;
        user_credits.bump = ctx.bumps.user_credits;

        emit!(BurnEvent {
            user: ctx.accounts.user.key(),
            amount,
            burn_amount,
            remint_amount,
            credits,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Burned {} tokens for {} credits", amount, credits);
        Ok(())
    }

    /// Register a creator to receive rewards
    pub fn register_creator(
        ctx: Context<RegisterCreator>,
        payout_address: Pubkey,
    ) -> Result<()> {
        let creator = &mut ctx.accounts.creator;
        creator.user = ctx.accounts.user.key();
        creator.payout_address = payout_address;
        creator.total_views = 0;
        creator.weekly_views = 0;
        creator.reputation_score = 50; // Start at 50/100
        creator.tier = CreatorTier::Silver;
        creator.total_earned = 0;
        creator.pending_rewards = 0;
        creator.registered_at = Clock::get()?.unix_timestamp;
        creator.bump = ctx.bumps.creator;

        emit!(CreatorRegistered {
            user: ctx.accounts.user.key(),
            payout_address,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Creator registered: {}", ctx.accounts.user.key());
        Ok(())
    }

    /// Record views for a creator (called by authorized backend)
    pub fn record_views(
        ctx: Context<RecordViews>,
        views: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            WayfindError::Unauthorized
        );

        let creator = &mut ctx.accounts.creator;
        creator.total_views = creator.total_views.checked_add(views)
            .ok_or(WayfindError::Overflow)?;
        creator.weekly_views = creator.weekly_views.checked_add(views)
            .ok_or(WayfindError::Overflow)?;

        msg!("Recorded {} views for creator {}", views, creator.user);
        Ok(())
    }

    /// Update creator reputation (called by authorized backend)
    pub fn update_reputation(
        ctx: Context<UpdateReputation>,
        score: u8,
        tier: CreatorTier,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            WayfindError::Unauthorized
        );
        require!(score <= 100, WayfindError::InvalidScore);

        let creator = &mut ctx.accounts.creator;
        creator.reputation_score = score;
        creator.tier = tier;

        msg!("Updated reputation for {}: score={}, tier={:?}", creator.user, score, tier);
        Ok(())
    }

    /// Distribute weekly rewards to a creator
    pub fn distribute_reward(
        ctx: Context<DistributeReward>,
        reward_amount: u64,
    ) -> Result<()> {
        require!(
            ctx.accounts.authority.key() == ctx.accounts.config.authority,
            WayfindError::Unauthorized
        );

        let config = &mut ctx.accounts.config;
        let creator = &mut ctx.accounts.creator;

        // Check remint pool has enough
        require!(
            config.remint_pool >= reward_amount,
            WayfindError::InsufficientPool
        );

        // Apply tier multiplier
        let multiplier = match creator.tier {
            CreatorTier::Bronze => 50,   // 0.5x
            CreatorTier::Silver => 100,  // 1.0x
            CreatorTier::Gold => 150,    // 1.5x
            CreatorTier::Platinum => 200, // 2.0x
            CreatorTier::Diamond => 250, // 2.5x
        };
        let final_reward = reward_amount * multiplier / 100;

        // Ensure we don't exceed weekly cap
        let week_seconds: i64 = 7 * 24 * 60 * 60;
        let current_time = Clock::get()?.unix_timestamp;
        if current_time - config.epoch_start >= week_seconds {
            // New epoch
            config.current_epoch += 1;
            config.epoch_start = current_time;
            config.total_reminted = 0;
        }

        require!(
            config.total_reminted.checked_add(final_reward).unwrap() <= config.weekly_cap,
            WayfindError::WeeklyCapExceeded
        );

        // Update creator
        creator.pending_rewards = creator.pending_rewards.checked_add(final_reward)
            .ok_or(WayfindError::Overflow)?;
        creator.weekly_views = 0; // Reset for next epoch

        // Update config
        config.remint_pool = config.remint_pool.checked_sub(final_reward)
            .ok_or(WayfindError::Underflow)?;
        config.total_reminted = config.total_reminted.checked_add(final_reward)
            .ok_or(WayfindError::Overflow)?;

        emit!(RewardDistributed {
            creator: creator.user,
            base_reward: reward_amount,
            multiplier,
            final_reward,
            epoch: config.current_epoch,
            timestamp: current_time,
        });

        msg!("Distributed {} tokens to creator {}", final_reward, creator.user);
        Ok(())
    }

    /// Claim pending rewards (mints new tokens to creator)
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        let creator = &mut ctx.accounts.creator;
        let amount = creator.pending_rewards;
        
        require!(amount > 0, WayfindError::NothingToClaim);

        // Mint tokens to creator's payout address
        let seeds = &[
            b"config".as_ref(),
            &[ctx.accounts.config.bump],
        ];
        let signer = &[&seeds[..]];

        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.token_mint.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.config.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, amount)?;

        // Update creator
        creator.total_earned = creator.total_earned.checked_add(amount)
            .ok_or(WayfindError::Overflow)?;
        creator.pending_rewards = 0;

        emit!(RewardClaimed {
            creator: creator.user,
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        msg!("Creator {} claimed {} tokens", creator.user, amount);
        Ok(())
    }
}

// ============================================
// ACCOUNTS
// ============================================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = config,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct BurnForCredits<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(mut)]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"treasury"],
        bump
    )]
    pub treasury: Account<'info, TokenAccount>,
    
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserCredits::INIT_SPACE,
        seeds = [b"credits", user.key().as_ref()],
        bump
    )]
    pub user_credits: Account<'info, UserCredits>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == token_mint.key()
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterCreator<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Creator::INIT_SPACE,
        seeds = [b"creator", user.key().as_ref()],
        bump
    )]
    pub creator: Account<'info, Creator>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RecordViews<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"creator", creator.user.as_ref()],
        bump = creator.bump
    )]
    pub creator: Account<'info, Creator>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"creator", creator.user.as_ref()],
        bump = creator.bump
    )]
    pub creator: Account<'info, Creator>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct DistributeReward<'info> {
    #[account(
        mut,
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        seeds = [b"creator", creator.user.as_ref()],
        bump = creator.bump
    )]
    pub creator: Account<'info, Creator>,
    
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    
    #[account(
        mut,
        constraint = token_mint.key() == config.token_mint
    )]
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        mut,
        seeds = [b"creator", user.key().as_ref()],
        bump = creator.bump
    )]
    pub creator: Account<'info, Creator>,
    
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.payout_address,
        constraint = creator_token_account.mint == token_mint.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// ============================================
// STATE
// ============================================

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub treasury: Pubkey,
    pub remint_pool: u64,
    pub weekly_cap: u64,
    pub current_epoch: u64,
    pub epoch_start: i64,
    pub total_burned: u64,
    pub total_reminted: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserCredits {
    pub user: Pubkey,
    pub credits: u64,
    pub total_burned: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Creator {
    pub user: Pubkey,
    pub payout_address: Pubkey,
    pub total_views: u64,
    pub weekly_views: u64,
    pub reputation_score: u8,
    pub tier: CreatorTier,
    pub total_earned: u64,
    pub pending_rewards: u64,
    pub registered_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, InitSpace)]
pub enum CreatorTier {
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
}

// ============================================
// EVENTS
// ============================================

#[event]
pub struct BurnEvent {
    pub user: Pubkey,
    pub amount: u64,
    pub burn_amount: u64,
    pub remint_amount: u64,
    pub credits: u64,
    pub timestamp: i64,
}

#[event]
pub struct CreatorRegistered {
    pub user: Pubkey,
    pub payout_address: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct RewardDistributed {
    pub creator: Pubkey,
    pub base_reward: u64,
    pub multiplier: u64,
    pub final_reward: u64,
    pub epoch: u64,
    pub timestamp: i64,
}

#[event]
pub struct RewardClaimed {
    pub creator: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ============================================
// ERRORS
// ============================================

#[error_code]
pub enum WayfindError {
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Invalid reputation score")]
    InvalidScore,
    #[msg("Insufficient remint pool")]
    InsufficientPool,
    #[msg("Weekly remint cap exceeded")]
    WeeklyCapExceeded,
    #[msg("Nothing to claim")]
    NothingToClaim,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Arithmetic underflow")]
    Underflow,
}
