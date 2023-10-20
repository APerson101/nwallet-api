import {TokenOperationsFactory, TokenOperationsFactoryConfig} from "@multiversx/sdk-core";
import {ApiNetworkProvider} from "@multiversx/sdk-network-providers";
import express, {Request, Response} from 'express';

import {createAccount, createRealEstateNFT, getAccount, tokenTransfer} from "./src/creator";
import {getEgldBalances, getNFTBalance} from "./src/retreive";
const app = express()
const port = 3000;
export const apiNetworkProvider = new ApiNetworkProvider("https://devnet-api.multiversx.com");


export let factory: TokenOperationsFactory;

const config = async () => {
  const networkConfig = await apiNetworkProvider.getNetworkConfig();
  factory = new TokenOperationsFactory(new TokenOperationsFactoryConfig(networkConfig.ChainID));
  return networkConfig;
}


async function main() {
  await config();

  // Middleware to parse JSON in request body
  app.use(express.json());

  // Sample route

  // GET request to the root path
  app.get('/', (req: Request, res: Response) => {
    res.send('Hello, TypeScript and Express!');
  });

  app.get('/egldbalance/:accountID', async (req: Request, res: Response) => {
    const {accountID} = req.params;
    const accountBalance = await getEgldBalances(accountID);
    res.send(accountBalance);
  });

  app.get('/nftbalance/:accountID', async (req: Request, res: Response) => {
    const {accountID} = req.params;
    const accountBalance = await getNFTBalance(accountID);
    res.json(accountBalance);
  });

  app.post('/api/createstateenft', async (req: Request, res: Response) => {
    const {quantity, value, uris, ticker, name} = req.body;
    console.log(quantity, value, uris, ticker, name)
    const nftID = await createRealEstateNFT(name, ticker, parseInt(quantity), (uris as string).split(','), parseInt(value));
    res.json({estateID: nftID});
  });



  app.post('/api/tokenTransfer', async (req: Request, res: Response) => {
    const {senderWords, receiver, nftID, type, amount, quantity} = req.body;
    await tokenTransfer(senderWords, receiver, type, amount, nftID, parseInt(quantity));
    res.json({status: 'SUCCESS'});
  });

  app.post('/api/createAccount', async (req: Request, res: Response) => {
    const account = await createAccount();
    res.json(account);
  });
  app.post('/api/getAccount', async (req: Request, res: Response) => {
    const {words} = req.body;
    const account = await getAccount(words);
    res.json(account);
  });
  // Handling 404 - Not Found
  app.use((req: Request, res: Response) => {
    res.status(404).send('Not Found');
  });

  // Start the server
  app.listen(port, '192.168.1.138', () => {
    console.log(`Server is running on http://localhost:${port}`);
  });

}
main().then((_) => { })
  .catch((error) => {
    console.log(error)
  })

