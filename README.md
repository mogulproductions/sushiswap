# Stars Staking

## StarsMasterChef

### Testing

```
npm i
npx hardhat test
```

 - Rewards are split among stakers based on the number of shares they own (i.e. what percentage of the pool their contribution makes up), and the number of allocation point that pool has relative to the total allocation points.
 - The Stars are rewarded in 3 epochs. In each epoch, different amounts of Stars are handed out per block. For example, in most of the test cases, total Stars given out are as follows: 200 Stars per block for the first 100,000 blocks, 70 Stars per block for blocks 100,000 to 300,000, and 20 Stars per block for blocks 300,000 to 600,000
 - accStarsPerShare represents the total number of Stars that one share grants, from startBlock to the lastRewardBlock.
 - Upon deposit, withdrawal, or reward collection, accStarsPerShare is incremented. The amount to increment is calculated as follows: the accumulated Stars per share, with the current pool, from startBlock to now, minus the accumulated Stars per share, with the current pool, from startBlock to lastRewardBlock.
 - Each user has a rewardDebt, which denotes how much of accStarsPerShare * user.amount is not actually owed to the user. This is recalculated every time the user deposits or withdraws tokens.
 - Pending rewards are given out upon deposit, withdrawal, or reward collection.


## License

[MIT](LICENSE.txt)
