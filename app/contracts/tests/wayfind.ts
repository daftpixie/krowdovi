import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Wayfind } from "../target/types/wayfind";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount
} from "@solana/spl-token";

describe("wayfind-devnet", () => {
  // Configure the client to use Devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Wayfind as Program<Wayfind>;
  const wallet = provider.wallet as anchor.Wallet;

  // We need persistent mints for devnet testing. 
  // Ideally, these are saved keypairs, but for this test we'll generate new ones
  // or use existing ones if you hardcode them.
  const wayfindMintKeypair = anchor.web3.Keypair.generate();
  const creditMintKeypair = anchor.web3.Keypair.generate();

  let programConfigPda: anchor.web3.PublicKey;
  let treasuryPda: anchor.web3.PublicKey;
  let remintPoolPda: anchor.web3.PublicKey;
  let creatorProfilePda: anchor.web3.PublicKey;

  let userWayfindAta: anchor.web3.PublicKey;
  let treasuryWayfindAta: anchor.web3.PublicKey;
  let remintPoolWayfindAta: anchor.web3.PublicKey;
  let userCreditAta: anchor.web3.PublicKey;

  console.log("Testing with wallet:", wallet.publicKey.toString());

  before(async () => {
    // 1. Derive PDAs
    [programConfigPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("program_config")],
      program.programId
    );

    [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );

    [remintPoolPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("remint_pool")],
      program.programId
    );

    [creatorProfilePda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("creator_profile"), wallet.publicKey.toBuffer()],
      program.programId
    );

    console.log("Program Config PDA:", programConfigPda.toString());

    // 2. Create Mints (Simulating the Token Generation Event)
    // In production, these would already exist.
    console.log("Creating Wayfind Mint...");
    await createMint(
      provider.connection,
      wallet.payer,
      wallet.publicKey, // Mint Authority
      null,
      6, // Decimals
      wayfindMintKeypair
    );
    console.log("Wayfind Mint:", wayfindMintKeypair.publicKey.toString());

    console.log("Creating Credit Mint...");
    await createMint(
      provider.connection,
      wallet.payer,
      programConfigPda, // Mint Authority must be the Program PDA for credits!
      null,
      0, // Credits usually 0 decimals
      creditMintKeypair
    );
    console.log("Credit Mint:", creditMintKeypair.publicKey.toString());

    // 3. Setup ATAs
    userWayfindAta = await getAssociatedTokenAddress(
      wayfindMintKeypair.publicKey,
      wallet.publicKey
    );

    treasuryWayfindAta = await getAssociatedTokenAddress(
      wayfindMintKeypair.publicKey,
      treasuryPda,
      true 
    );

    remintPoolWayfindAta = await getAssociatedTokenAddress(
      wayfindMintKeypair.publicKey,
      remintPoolPda,
      true 
    );

    userCreditAta = await getAssociatedTokenAddress(
      creditMintKeypair.publicKey,
      wallet.publicKey
    );

    // 4. Mint tokens to user so they can burn them
    console.log("Minting test tokens to user...");
    const userAtaAccount = await getOrCreateAssociatedTokenAccount(
        provider.connection,
        wallet.payer,
        wayfindMintKeypair.publicKey,
        wallet.publicKey
    );

    await mintTo(
        provider.connection,
        wallet.payer,
        wayfindMintKeypair.publicKey,
        userAtaAccount.address,
        wallet.payer,
        1000000000 // 1000 tokens
    );
  });

  it("Initialize Program", async () => {
    try {
      const tx = await program.methods
        .initialize()
        .accounts({
          authority: wallet.publicKey,
          programConfig: programConfigPda,
          wayfindMint: wayfindMintKeypair.publicKey,
          creditMint: creditMintKeypair.publicKey,
          treasury: treasuryPda,
          remintPool: remintPoolPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log("Initialize TX:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (e) {
      console.log("Initialize Error (might be already initialized):", e);
    }
  });

  it("Register Creator", async () => {
    try {
      const tx = await program.methods
        .registerCreator("Devnet Tester")
        .accounts({
          authority: wallet.publicKey,
          creatorProfile: creatorProfilePda,
          programConfig: programConfigPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("Register Creator TX:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (e) {
      console.log("Register Creator Error:", e);
    }
  });

  it("Burn 100 Wayfind for Credits", async () => {
    const amountToBurn = new anchor.BN(100000000); // 100.000000 tokens

    try {
        const tx = await program.methods
            .burnForCredits(amountToBurn)
            .accounts({
                authority: wallet.publicKey,
                programConfig: programConfigPda,
                wayfindMint: wayfindMintKeypair.publicKey,
                creditMint: creditMintKeypair.publicKey,
                userWayfindAccount: userWayfindAta,
                treasuryWayfindAccount: treasuryWayfindAta,
                remintPoolWayfindAccount: remintPoolWayfindAta,
                userCreditAccount: userCreditAta,
                treasury: treasuryPda,
                remintPool: remintPoolPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
                systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
        console.log("Burn TX:", `https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (e) {
        console.log("Burn Error:", e);
    }
  });
});
