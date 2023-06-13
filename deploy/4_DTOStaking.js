const {
  chainNameById,
  chainIdByName,
  saveDeploymentData,
  getContractAbi,
  getTxGasCost,
  log,
} = require('../js-helpers/deploy')
const { upgrades } = require('hardhat')

const _ = require('lodash')

module.exports = async (hre) => {
  const { ethers, upgrades, getNamedAccounts } = hre
  const { deployer, protocolOwner, trustedForwarder } = await getNamedAccounts()
  const network = await hre.network
  const deployData = {}

  const chainId = chainIdByName(network.name)
  if (chainId === 31337) return
  //const alchemyTimeout = chainId === 31337 ? 0 : (chainId === 1 ? 5 : 3);
  const DTOAddress = require(`../deployments/${chainId}/DTO.json`).address
  const rewardToken = DTOAddress

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
  log('DTO Staking Contract Deployment')
  log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n')

  log('  Using Network: ', chainNameById(chainId))
  log('  Using Accounts:')
  log('  - Deployer:          ', deployer)
  log('  - network id:          ', chainId)
  log('  - Owner:             ', protocolOwner)
  log('  - Trusted Forwarder: ', trustedForwarder)
  log(' ')
  log('Deploying StakingTokenLock...')
  const StakingTokenLock = await ethers.getContractFactory('StakingTokenLock')
  let stakingTokenLockAddress = require(`../deployments/${chainId}/StakingTokenLock.json`)
    .address
  let stakingTokenLock = await StakingTokenLock.attach(stakingTokenLockAddress)

  log('  Deploying DTO Staking...')
  const DTOStaking = await ethers.getContractFactory('DTOStaking')
  const dtoStaking = await upgrades.deployProxy(
    DTOStaking,
    [
      rewardToken,
      DTOAddress,
      stakingTokenLock.address,
      0,
      0,
      180 * 86400,
      2 * 86400,
    ],
    {
      unsafeAllow: ['delegatecall'],
      unsafeAllowCustomTypes: true,
      kind: 'uups',
      gasLimit: 1000000,
    },
  )
  await stakingTokenLock.initialize(dtoStaking.address)
  log('  - DTOStaking:         ', dtoStaking.address)
  deployData['DTOStaking'] = {
    abi: getContractAbi('DTOStaking'),
    address: dtoStaking.address,
    deployTransaction: dtoStaking.deployTransaction,
  }
  deployData['StakingTokenLock'] = {
    abi: getContractAbi('StakingTokenLock'),
    address: stakingTokenLock.address,
    deployTransaction: stakingTokenLock.deployTransaction,
  }

  saveDeploymentData(chainId, deployData)
  log('\n  Contract Deployment Data saved to "deployments" directory.')

  log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n')
}

module.exports.tags = ['dtoStaking']
