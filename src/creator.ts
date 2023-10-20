import {Account, Address, GasEstimator, ITransactionOnNetwork, TokenOperationsOutcomeParser, TokenTransfer, Transaction, TransactionWatcher, TransferTransactionsFactory} from "@multiversx/sdk-core";
import {Mnemonic, UserSigner} from "@multiversx/sdk-wallet";
import axios from "axios";
import * as dotenv from 'dotenv';
import {apiNetworkProvider, factory} from "..";
const APIUrl = "https://devnet-api.multiversx.com";

dotenv.config();
export const createAccount = async () => {
  const mnemonic = Mnemonic.generate();
  const secretKey = mnemonic.deriveKey(0);
  const publicKey = secretKey.generatePublicKey()
  const address = publicKey.toAddress()
  const bech32 = address.bech32();
  const words = mnemonic.getWords()
  const hexValue = secretKey.hex()
  const joinedwords = words.join(" ")
  return {'words': joinedwords, 'address': bech32}
}

export const getAccount = async (words: string) => {

  try {
    Mnemonic.assertTextIsValid(words);
    const mnemonic = Mnemonic.fromString(words);
    const secretKey = mnemonic.deriveKey(0);
    const publicKey = secretKey.generatePublicKey()
    const address = publicKey.toAddress()
    const bech32 = address.bech32();
    return {'words': words, 'address': bech32}
  } catch (error) {
    console.log(error)
    return 'INVALID'
  }
}


export const tokenTransfer = async (senderWords: string, receiverAddress: string, type: string, amount?: string,
  identifier?: string, quantity?: number
) => {
  const _factory = new TransferTransactionsFactory(new GasEstimator());
  let _transfer: TokenTransfer;
  const mnemonic = Mnemonic.fromString(senderWords);
  const secretKey = mnemonic.deriveKey(0);
  const senderAddress = secretKey.generatePublicKey().toAddress();
  const nonce = await recallAccountNonce(Address.fromBech32(senderAddress.bech32()));
  const signer = new UserSigner(secretKey);
  let account = new Account(senderAddress);
  account = await sync(account);
  if (type === 'egld')
    _transfer = TokenTransfer.egldFromAmount(amount!);
  if (type === 'fungible')
    _transfer = TokenTransfer.fungibleFromAmount(identifier!, amount!, 2);
  if (type === 'semi')
    _transfer = TokenTransfer.semiFungible(identifier!, 3, quantity!);
  else
    _transfer = TokenTransfer.nonFungible(identifier!, nonce);

  const tx2 = _factory.createESDTNFTTransfer({
    tokenTransfer: _transfer,
    nonce: nonce,
    sender: senderAddress,
    gasPrice: 1000000000,
    destination: Address.fromBech32(receiverAddress),
    chainID: "D"
  });

  console.log('transfering', type, identifier, receiverAddress);
  console.log(_transfer);
  const serialzed = tx2.serializeForSigning();
  const signature = await signer.sign(serialzed);
  tx2.applySignature(signature);
  await broadcastTransaction(tx2)
}


export async function createRealEstateNFT(name: string, ticker: string, quantity: number, uris: string[], value: number) {

  const mnemonic = Mnemonic.fromString(process.env.SENDER_WORDS!);
  const secretKey = mnemonic.deriveKey(0);
  const signer = new UserSigner(secretKey);
  const issuerAddress = secretKey.generatePublicKey().toAddress();
  let account = new Account(issuerAddress);

  return await NFTIssueCreate(name, ticker, quantity, uris, account, signer);

}

async function broadcastTransaction(transaction: Transaction) {
  const url = `${APIUrl}/transactions`;
  const data = transaction.toSendable();

  const response = await axios.post(url, data, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  console.log(response.data.txHash);
  const watcher = new TransactionWatcher(apiNetworkProvider);
  const transactionOnNetwork = await watcher.awaitCompleted(transaction);
  console.log(transactionOnNetwork);
}


async function recallAccountNonce(address: Address) {
  const url = `${APIUrl}/accounts/${address.toString()}`;
  const response = await axios.get(url);
  return response.data.nonce;
}


async function RegisterSetRoles(senderWords: string) {
  const mnemonic = Mnemonic.fromString(senderWords);
  const secretKey = mnemonic.deriveKey(0);
  const adr = secretKey.generatePublicKey().toAddress();
  const signer = new UserSigner(secretKey);
  const acc = new Account(adr);
  const nonce = new Account(adr).nonce;
  const tx1 = factory.registerAndSetAllRoles({
    issuer: adr,
    tokenName: "TEST",
    tokenTicker: "TEST",
    tokenType: "NFT",
    numDecimals: 2,
    transactionNonce: nonce
  });


  const tx1OnNetwork = await processTransaction(acc, signer, tx1, "tx1");
  const parser = new TokenOperationsOutcomeParser();
  const tx1Outcome = parser.parseRegisterAndSetAllRoles(tx1OnNetwork);
}


async function NFTIssueCreate(name: string, ticker: string, quantity: number, uris: string[], account: Account, signer: UserSigner) {

  account = await sync(account);

  // Issue NFT
  const tx1 = factory.issueNonFungible({
    issuer: account.address,
    tokenName: name,
    tokenTicker: ticker,
    canFreeze: true,
    canWipe: true,
    canPause: true,
    canTransferNFTCreateRole: true,
    canChangeOwner: true,
    canUpgrade: true,
    canAddSpecialRoles: true,
    transactionNonce: account.nonce
  });
  account = await sync(account);

  const tx1OnNetwork = await processTransaction(account, signer, tx1, "tx1");
  const parser = new TokenOperationsOutcomeParser();
  const tx1Outcome = parser.parseIssueNonFungible(tx1OnNetwork);
  const tokenIdentifier = tx1Outcome.tokenIdentifier;
  account = await sync(account);

  // // Set roles (give Grace the ability to create NFTs)
  await addRolesToAccount(account, tokenIdentifier, signer, parser);
  account = await sync(account);
  await wait(60000);
  account = await sync(account);
  // Create NFTs, then update their attributes
  await nftcreate(name, account, tokenIdentifier, signer, quantity, uris);
  return tokenIdentifier;
}

async function addRolesToAccount(account: Account, tokenIdentifier: string, signer: UserSigner, parser: TokenOperationsOutcomeParser) {
  const tx2 = factory.setSpecialRoleOnNonFungible({
    manager: account.address,
    user: account.address,
    tokenIdentifier: tokenIdentifier,
    addRoleNFTCreate: true,
    addRoleNFTBurn: false,
    addRoleNFTUpdateAttributes: true,
    addRoleNFTAddURI: true,
    addRoleESDTTransferRole: false,
    transactionNonce: account.nonce
  });

  const tx2OnNetwork = await processTransaction(account, signer, tx2, "tx2");
  const tx2Outcome = parser.parseSetSpecialRole(tx2OnNetwork);
  console.log(tx2Outcome);
}


function wait(timeout: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeout);
  });
}


async function nftcreate(name: string, account: Account, tokenIdentifier: string, signer: UserSigner,
  quantity: number, uris: string[]) {
  for (let i = 1; i <= quantity; i++) {
    // Create
    const txCreate = factory.nftCreate({
      creator: account.address,
      tokenIdentifier: tokenIdentifier,
      initialQuantity: "1",
      name: `${name}-${i}`,
      royalties: 0,
      hash: "abba",
      attributes: Buffer.from("d"),
      uris: uris,
      transactionNonce: account.nonce
    });
    const txCreateOnNetwork = await processTransaction(account, signer, txCreate, "txCreate");
    console.log(txCreateOnNetwork);
  }
}

async function processTransaction(account: Account, signer: UserSigner, transaction: Transaction, tag: string): Promise<ITransactionOnNetwork> {
  const watcher = new TransactionWatcher(apiNetworkProvider);
  // const watcher = new TransactionWatcher(apiNetworkProvider, {patienceMilliseconds: 8000});
  account.incrementNonce();
  const sig = await signer.sign(transaction.serializeForSigning());
  transaction.applySignature(sig);
  await apiNetworkProvider.sendTransaction(transaction);
  console.log(`Sent transaction [${tag}]: ${transaction.getHash().hex()}`);
  const transactionOnNetwork = await watcher.awaitCompleted(transaction);
  return transactionOnNetwork;
}


async function sync(account: Account) {
  let accountOnNetwork = await apiNetworkProvider.getAccount(account.address);
  account.update(accountOnNetwork);
  return account;
}