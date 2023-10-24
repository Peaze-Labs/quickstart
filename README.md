# Quickstart

Peaze greatly simplifies the user experience of your dApp. With it, users can seamlessly perform arbitrary transactions across chains **with no gas tokens needed**.

On the development side, things are just as easy. Unlike other gasless solutions, **no contract changes are needed**. Just two API calls and the transaction is underway!

## Quick-quickstart

This is a companion repo to our [Quickstart](https://docs.peaze.com/developers/quickstart) guide. Please check it out for a complete walkthrough of how to build a transaction with Peaze. 

### What you'll need

1. For a single-chain demo, $0.1 worth of Polygon [USDC](https://polygonscan.com/token/0x2791bca1f2de4661ed88a30c99a7a9449aa84174). For a cross-chain demo, $1 worth of Polygon [USDC](https://polygonscan.com/token/0x2791bca1f2de4661ed88a30c99a7a9449aa84174) (extra to account for bridging).

### Setting up

```sh
git clone https://github.com/Peaze-Labs/quickstart.git
cd quickstart
npm i
cp .env.example .env
```

Then fill in your private key in `.env`. 

> Your wallet will play the role of the user in the demo, it will be used to sign the transaction.

### Running the demo

```sh
npx ts-node quickstart.ts
```

This will run a single-chain demo transaction of gaslessly wrapping 0.01 USDC into WUSDC. To run a cross-chain transaction, simply replace the value of `DST_CHAIN_ID` with your desired chain ID in `.env`.

That's it! Easy-peazy, right? 🤓
