---
title: Gambit - My first dApp
date: 2026-04-06T14:30:00
description: Exploring the history and current state of my favourite personal project
published: true
---


## Overview

Gambit is a decentralized betting platform. It allows users to create bets using cryptocurrency with a group of up to 16. User sign in with their browser wallet and interact with a smart contract that facilitates the lifecycle of the bet. Bets are settled optimistically, meaning the bets enter a *claim* period where anyone can post collateral to claim they are the winner. If one person claims, they win the bet. If more than one claim, the bet is voted on by a jury.

The jury is a separate smart contract custom written for Gambit. There is a jury fee to join and jurors can vote on conflicted bets. Since everything is on-chain, the jury has a commit phase and a reveal phase. Jurors first lock in their votes anonymously, then when commit phase expires, they reveal their votes. The participant of the conflicted bet holding the position that was voted on the most receives their winnings and their collateral, the loser nothing, losing the posted collateral. The jurors that voted in the majority receive their cut back as well as a cut of the dissenting jurors' collateral, and the dissenting jurors nothing at all. 

## Architecture

### Tech stack

Gambit's architecture saw myriad changes over its development. The following is where it end up in the end:
- **Front end:** Svelte, TailwindCSS, Shadcn, Ethers.js
- **Back end:** SvelteKit, Node.js, [IPFS](https://ipfs.tech/)
- **Database:** PostgreSQL
- **Smart contract:** [Solidity](https://www.soliditylang.org/), [Hardhat](https://hardhat.org/)
- **Blockchain:** [Polygon](https://polygon.technology/)
- **Blockchain RPC provider:** [Alchemy](https://www.alchemy.com/)
- **CI/CD:** Docker, GitHub Actions 
- **Testing:** Vitetest
- **Hosting:** [DigitalOcean](https://digitalocean.com/), [Caddy](https://caddyserver.com/)

The history section details where the stack started and how it settled on where it is now.

### An interesting solution to storing metadata on the blockchain with the IPFS

Developing in Solidity, a complied language used for writing smart contracts, introduces a new challenge not really found in web development. Running smart contract functions is no different than broadcasting any other transaction over an Etheruem-compatible blockchain. Specifically, they require a *gas fee*, meaning the sender must have a small amount of network-native token to ensure their block gets mined (which incentivizes people to behave economically, keeping the blockchain clean and efficient). The cost of gas for smart contract calls is a function of the code being run. Certain things are more expensive, such as long for-loops or storing large pieces of data, so clever optimizations are required to keep costs low.

Most optimizaiton just involve improving time complexity or exploiting a specific aspect of a problem. On problem without a trivial solution was the storage of a bet's metadata. Simply storing large Blobs on-chain becomes prohibitively expensive, and since our database is not directly involved in creating bets—it only picks up contract events after the data is written, this became a difficult problem: We need to ensure trustlessness, keep gas costs affordable, and preserve our current architecture. 

I had learned of something recently called the InterPlanetary File System (IPFS). It is a decentralized file storage solution. You upload any data you like, you receive a content ID hash (CID), and you can get the data back using this hash. The solution was then:
- During client-side bet creation, `POST` the bet metadata to the IPFS
- Use the CID as the *questionId* for the on-chain bet (a unique surrogate key required for the Gnosis Conditional Token Framework used for creating collateralized tokens on-chain)
- Use the questionId of the bet as the key to retrieve the credentials from the IPFS when the Node listener picks up the contract event


This solves all three problems outlined above. Furthermore, just like the on-chain bets, anyone can verify the metadata at bet creation matches the current rules in our database by sending their own `GET` request to the IPFS with a given bet's public, on-chain questionId so to ensure the database is an honest report of what the creator intened. No new data needs to be added to the contract, as the quesitonId was already a random string of bytes. Merely its interpretation changes. This also automatically enforces that bets have a unique combination of title, rules, and template, which is a nice side effect.


## Whether it's a scam

A core tenant of Gambit is trustlessness. This means that participating does not require one to trust website itself. When placing or joining a bet, tokens are sent to a smart contract, not a personal wallet. These tokens are locked away with respect to how the code is written on the smart contract, i.e. one will only receive winnings for winning the bet/the jury round. Think of Gambit as a sleek, convenient user interface for interacting with a smart contract. It offers the following services:
- Sign-in functionality to make bets with one's own wallet address
- Client-side JavaScript for making smart contract calls with a browser wallet (create, join, claim, vote on jury, etc.)
- A database that caches blockchain interactions to make it clear who has a position on what bet

Notice that the smart contract on Polygon does not require any of these things. In principle, one could use some other tool to interact with the blockchain (and our site would pick it up and that person would have an account generated for them on the site). The smart contract is the source of truth, and since that code is public and immutable, there is no need to trust the website Gambit. In conclusion, we are in no better of a position to scam you than any other user on the app.

## History

### Bettt

Gambit began as a simple idea between friends. That name was created later, at this point it was called Bettt, a play on a previous entrepreneurial venture [Polll](https://github.com/rileywheadon/poll-app). We wanted to capture the excitement of betting on real world events, but remove the market dynamic. When bet prices are pre-determined and locked in, one is only as profitable as they are competent at predicting the future. This is the fundamental difference between Gambit and prediction markets like [Polymarket](https://polymarket.com), and why, in my opinion, does not fit the trading or gambling label.

A proof of concept was drafted in the beginning of summer 2025. We decided on a humble stack: pure html with TailwindCSS on the front end, Flask as a web server, SQLite as a file-based database, and DigitalOcean as a hosting provider. It began as a simple CRUD app. Account information was stored in the database, bets were able to be created, confirmed, and settled via mutual agreement. The goal, contrastly to Polll, was to satisfy the requirements in the simplest manner possible. 

In line with this philosophy, the platform initially assumed that parties know and trust one another to agree on the winner. This works in theory, but the web interface's inherent friction could not mirror the spontaneity of a traditional in person cash-settled bet, so something had to change. I wanted to add a cash-in/cash-out flow, but summer commitments and being away from team members made progress difficult. I tinkered with it here and there, improving the front end experience significantly and adding more features such as private bets and followers, but nothing in the direction of marketing. As much as the idea still captivated me, progress halted and the project fell into dormancy.

### Deciding to monetize

Fast-forward to the beginning of the 2026, we decided to bring Gambit out of dormancy after a handful of bad startup ideas. I had done enough personal projects by then to only engage with something new if it was a) substantially edifying, or b) potentially profitable. Since the app was already fully functional, monetization was the core motivating factor. This relatively low barrier to completion (so we thought), was provided enough conviction to revive the project. 

After tying up some of the previous implementation's lose ends, we began discussing monetary architecture. Our naive instinct was to throw a [Stripe](https://stripe.com) in front of our current setup and treat the fake tokens already in the app as collateralized assets. There are several problems with this, but the biggest and most important at the time was financial. The already thin margins we operate at from taking a cut of volume through the app disappeared after introducing a third party payment provider. Furthermore, these web-based payment gateways are designed for online products and services that the platform owns, not to facilitate what is essentially the on-ramping of centralized, fungible tokens. The only other option was cryptocurrency.

### Moving to crpytocurrency

Cryptocurrency has several advantages that I learned with time, but financial flexibility was initially the initial attractor. The fees were trivial (fractions of cents) and there was no need to fight a system that wasn't designed for our use case. That is not to say it comes without disadvantages. Ignoring the order of magnitude increase in complexity, the audience for such a platform would either shift, or become a major marketing challenge. Nonetheless, the difficulty felt promising. If it were trivial, people would have done it already. And for idea so seemingly simple, this felt like the correct general architectural direction.

The first implementation was essentially crpytocurreny in lieu of fiat. When users sign up, they would receive a unique proxy wallet address under their account, which was still using Auth0 at the time. They fund their account by sending money to this proxy address. The app otherwise works as previously established. The tokens are a 1-1 match with the stablecoin we chose to accept: USDC. Users can withdrawal at any point up to the number of tokens in their account. This implementation 'worked', but there were several problems. 

Most apparent is the implementation's inherent fragility. There is nothing binding the tokens on the app to real world currency, so any bug or involving token transfer or hack to the site breaks the app's financially integrity. A more subtle issue however which seems impossible at first to solve is that of *trust*. How do we convince users to trust that our app will always honestly facilitate withdrawals? The irony in this implementation is its contradiction to a core tenant of cryptocurrency: Trustlessness. After growing annoyed with the flaws of this implementation and further researching blockchain-based apps, the old implementation was scrapped. Further down the Web3 rabbit hole we journeyed.

### Fully decentralizing
A smart contract is a piece of code that can execute transactions on a blockchain. The only functional difference between a smart and legal contract is that compliance is enforced via cryptography as opposed of the judicial system. A decentralized app (dApp) is a web app with its core business logic on a smart contract. This is an even stronger condition than an open source project, as not only is the code public for everyone to see on a blockchain, but it is immutable. Everything about this appealed to me, from migrating the source of financial truth to a blockchain, to removing the in-house token-minting pipeline. The codebase shifted to quickly to address this change.

This was the most difficult part of the project, which was uniquely frustrating as the difficulty itself was tangential to writing the core business logic as a smart contract. Python was still being used here and the libraries for developing smart contracts and containerizing was several orders more difficult than I naively predicted. Eventually, the environment issues were reconciled and the contract was written and tested, isolated from the web app. 

Integrating the contract code was trivial, but implementing a full bet lifecycle revealed a fundamental issues or architecture/data flow, and by consequence, our tech stack.

The problem became apparent in contemplating how the time-based events are to be implemented. For the app to know when certain parts of the bet lifecycle are live, it requires either a polling or websocket connection over the blockchain, or a user-issued HTTP request on a page where the bet is visible. None of these were very appealing, and there was this additional looming threat of architectural fragility in how the blockchain was being queried. When a user places a bet, they send an HTTP request to our server, which performs a database query and a blockchain transaction simultaneously. Notice how there still exists trust on us as website providers to fulfill the transaction. This needed to change, but the shift is subtle.

### Thickening the client 

After juggling various implementations around, the most critical architectural shift was made: Removing the server from blockchain writes. This required a significant rewrite of the front and back end. Instead of the server being responsible for writing to the blockchain and database, we would offload the former task to a user's browser wallet on the client, the detect these contract events and write them to the database with a WebSocket connection to a blockchain RPC provider. This was the cleanest approach and essentially solves the decentralization problem full stop. Although this was feasible, the tech stack  immediately caused.

A simple micro web framework like Flask paired with HTMX and Alpine.js works very well for simple Web2 apps primarily because it is designed after the synchronous request-response model. This blockchain-listener model flips this paradigm. Interactions are asynchronous and do not reach the server nearly as often. This positions a more complete JavaScript libary/frameowrk such as React or Svelte a strong candidate. It's not just introducing meaningless bloat or covering up laziness with abstraction, it's providing a tool that Flask with pure HTML does not (or would make very difficult). I heard great things about SvelteKit with Node, so this was what was chosen. This proved to be a very wise decision.

Due to SvelteKit's similarity to Flask's Jinja templating engine, the HTML rewrites were rapid. There was a learning curve for transfering server-side Python logic to TypeScript client-side blockchain interaction, but the outcome was immediately better. Front end became clean and modern, and client-side blockchain interaction with browser logic felt smooth and natural. Testing was also very simple and intutative. Unifying the entire tech stack into one language made integration tests seamless, while still being able to isolate certain atomic behaviours. 


### Current state

The app is essentially finished. The contract is fully written and tested, a full bet lifecycle can be performed, people can join the jury, the Node listener picks up smart contract events and adds them to the database. I'm taking a break from developing it and since there are no plans of marketing it as of yet, the website is no longer live. This was very captivating as a personal project and has motivated me to work on more Web3-related things. 
