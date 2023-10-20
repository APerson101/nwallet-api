// get balance and get all tokens related to account

import {Address} from "@multiversx/sdk-core/out";
import {apiNetworkProvider} from "..";


export const getEgldBalances = async (address: string) => {
  const _adr = Address.fromBech32(address);
  const aon = await apiNetworkProvider.getAccount(_adr);
  console.log(aon.balance)
  return aon.balance;
}

export const getFungibleBalance = async (address: string) => {
  const _adr = Address.fromBech32(address);
  const tokens = await apiNetworkProvider.getFungibleTokensOfAccount(_adr);
  const tokensBalances = []
  for (let index = 0; index < tokens.length; index++) {
    const element = tokens[index];
    tokensBalances.push({'identifier': element.identifier, 'balance': element.balance});
  }
  console.log(tokensBalances)
  return tokensBalances;
}
export const getNFTBalance = async (address: string) => {
  const _adr = Address.fromBech32(address);
  const tokens = await apiNetworkProvider.getNonFungibleTokensOfAccount(_adr);
  const tokensBalances = []
  for (let index = 0; index < tokens.length; index++) {
    const element = tokens[index];
    tokensBalances.push({
      'name': element.name,
      'identifier': element.identifier, 'balance': element.balance
    });
  }

  console.log(tokensBalances);
  return tokensBalances;
}
export const getNFTInfo = async (identifier: string) => {
  const data = await apiNetworkProvider.getNonFungibleToken(identifier, 7);
  console.log(data);
  return data;
}
//use wallet connect (?)
