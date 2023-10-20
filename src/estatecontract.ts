import {AbiRegistry, Address, SmartContract} from "@multiversx/sdk-core/out";
import * as fs from "fs";
import * as path from "path";
import {apiNetworkProvider} from "..";
export const testContract = async () => {
  const abitxt = await fs.promises.readFile(path.join(__dirname, "../../data/realestate.abi.json"), 'utf-8');
  let abiJson = JSON.parse(abitxt as string)
  const abi = AbiRegistry.create(abiJson);
  const contractAddress = Address.fromBech32("erd1qqqqqqqqqqqqqpgqtwkrz3zl9nz7yn87h33yty6fh59jjpatr92s8qh5c6")
  let existingContract = new SmartContract({address: contractAddress, abi: abi});
  const itn = existingContract.methods.getdetails();
  const query = itn.check().buildQuery();
  const request: any = {}
  request.scAddress = query.address.bech32();
  request.caller = undefined;
  request.funcName = query.func.toString();
  request.value = undefined;
  request.args = query.getEncodedArguments();
  // await axios.post("https://devnet-api.multiversx.com/query", request)
  const response = await apiNetworkProvider.queryContract(query);
  // const parsed = new ResultsParser().parseQueryResponse(response, itn.getEndpoint());
  // console.log(parsed.values);
}
testContract().then((_) => { }).catch((err) => console.log(err))