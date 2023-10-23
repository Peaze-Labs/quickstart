import axios from 'axios';
import { Interface, Wallet, parseUnits } from 'ethers';
import { addresses } from './utils/config';
import { config } from 'dotenv';
import { getUserInputYN } from './utils/input';
config();

const SRC_CHAIN_ID = 137; // 1 - Ethereum, 137 - Polygon, 42161 - Arbitrum
const DST_CHAIN_ID = 137; // 10 - Optimism, 8453 - Base
const DST_USDC_ADDRESS = addresses[DST_CHAIN_ID].USDC; // USDC on destination
const DST_WUSDC_ADDRESS = addresses[DST_CHAIN_ID].WUSDC; // WUSDC on destination
const USDC_TO_SEND = '0.01';

const usdcTokenInterface = new Interface(['function approve(address,uint256)']);
const wUsdcTokenInterface = new Interface(['function mint(uint256)']);

const wallet = new Wallet(process.env.WALLET_PRIVATE_KEY!); // set it in .env

const axiosClient = axios.create({
  baseURL: 'https://api.peaze.com/api',
  headers: {
    'Content-Type': 'application/json',
    'X-Api-Key': process.env.PEAZE_API_KEY, // set PEAZE_API_KEY in .env
  },
});

const isSingleChain = SRC_CHAIN_ID === DST_CHAIN_ID;
const endpointPrefix = isSingleChain ? '/v1/single-chain/' : '/v1/cross-chain/';

async function estimateTransaction() {
  // Convert the USDC amount to *destination* chain decimals (6 on supported chains)
  const tokenAmount = parseUnits(USDC_TO_SEND, 6);

  // Encode a tx to approve the WUSDC contract to transfer USDC from the caller
  const approvalTx = {
    to: DST_USDC_ADDRESS,
    data: usdcTokenInterface.encodeFunctionData('approve', [
      DST_WUSDC_ADDRESS,
      tokenAmount,
    ]),
  };

  // Encode a tx to mint WUSDC tokens
  const mintTx = {
    to: DST_WUSDC_ADDRESS,
    data: wUsdcTokenInterface.encodeFunctionData('mint', [tokenAmount]),
    value: 0n.toString(), // can be omitted here, since this transaction has value 0
  };

  // Specify that we expect to receive WUSDC tokens as a result of the tx
  const expectedERC20Tokens = [DST_WUSDC_ADDRESS];

  // Send the request to the estimate endpoint
  const { data } = await axiosClient.post(`${endpointPrefix}estimate`, {
    sourceChain: SRC_CHAIN_ID,
    destinationChain: DST_CHAIN_ID,
    userAddress: wallet.address, // address signing and funding the tx with USDC
    tokenAmount: tokenAmount.toString(), // amount of USDC to fund the tx with (in decimals)
    transactions: [approvalTx, mintTx], // array of transactions to execute
    expectedERC20Tokens, // array of ERC-20 tokens we expect to receive as a result of the tx
  });

  return data;
}

async function main() {
  console.log('-'.repeat(60));
  console.log(`Quickstart tx from chain ${SRC_CHAIN_ID} to ${DST_CHAIN_ID}`);
  console.log('-'.repeat(60) + '\n');
  
  console.log('Getting tx estimate...');

  const { quote, costSummary } = await estimateTransaction();
  console.log(`Quote data:\n${JSON.stringify(quote, null, 2)}\n`);

  // Extract typed data to sign
  const { peazeTypedData, permitTypedData } = quote;

  // Generate required signatures
  const signatures = {
    peazeSignature: await wallet.signTypedData(
      peazeTypedData.domain,
      peazeTypedData.types,
      peazeTypedData.message,
    ),
    permitSignature: await wallet.signTypedData(
      permitTypedData.domain,
      permitTypedData.types,
      permitTypedData.message,
    ),
  };

  // Show total cost and check if we want to proceed
  const totalCost: number = costSummary.totalAmount;
  console.log(`Total cost (tx amount + gas + fees): ${totalCost} USDC\n`);

  const shouldExecute = await getUserInputYN(
    'Signatures generated. Would you like to execute the tx? (y/n) ',
  );
  if (!shouldExecute) return;

  // Send the request to the execute endpoint
  console.log('Executing transaction...');
  const { data } = await axiosClient.post(`${endpointPrefix}execute`, {
    quote,
    signatures,
  });

  console.log(`Transaction submitted:\n${JSON.stringify(data, null, 2)}\n`);
  if (isSingleChain) return;
  console.log(
    'Monitor the cross-chain tx status on https://layerzeroscan.com.',
    'Simply search for the tx hash shown above.',
  );
}

main().catch(e => {
  const errorMsg = e.response?.data?.message ?? `${e}`;
  const errorDetails = JSON.stringify(e.response?.data?.data, null, 2);

  console.log('Oops... we got an error :(');
  console.log(errorMsg);
  if (errorDetails) console.log(`Error details:\n${errorDetails}`);
  process.exit(1);
});
