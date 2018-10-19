// import { ENCRYPTED } from 'laksa-wallet'
import { Messenger } from '../../laksa-core-messenger/src'
import { ProtobufProvider as HttpProvider } from '../../laksa-providers-http/src'
import { Wallet } from '../src'

const provider = new HttpProvider('https://api-scilla.zilliqa.com')
const messenger = new Messenger(provider)
const wallet = new Wallet(messenger)
const testPrivateKey = '97d2d3a21d829800eeb01aa7f244926f993a1427d9ba79d9dc3bf14fe04d9e37'
const keyList = [
  'f768fe522e232f6226ab9abbf9085c06a496e9ece817a1082a405bd014f2f7aa',
  'bb1aca6190dbef0acb5eb77af19d096ec83e18ee39617afe7ca40e788b2ad376',
  '39fb52fe27744b75b5583e5556d554501c1aba7c9c0866aedbed700654e2ccfd',
  '9cedccceb609d0ed4851730dfc414387ed4822c155d4bd4143f184ae7e176bdc',
  '997da226b6f516973b0c4386256bed487715e4efadd0120939798ba0e7e77f6f'
]
describe('test Wallet', () => {
  it('should be able CRUD accounts', () => {
    const newAccount = wallet.createAccount()
    expect(wallet.accounts.length).toEqual(1)
    try {
      wallet.accounts = 2
    } catch (error) {
      expect(error.message).toEqual(
        'you should not set "accounts" directly, use internal functions'
      )
    }
    expect(newAccount.privateKey).toEqual(expect.any(String))
    wallet.setSigner(newAccount)
    expect(wallet.signer).toEqual(newAccount.address)
    expect(wallet.defaultAccount).toEqual(newAccount.address)
    expect(wallet.getWalletAccounts().length).toEqual(1)
    const batchAccount = wallet.createBatchAccounts(5)
    expect(wallet.getWalletAccounts().length).toEqual(batchAccount.length + 1)
    const accountFirst = batchAccount[0]
    expect(wallet.getAccountByIndex(1).address).toEqual(accountFirst.address)
    expect(wallet.getAccountByAddress(accountFirst.address).publicKey).toEqual(
      accountFirst.publicKey
    )
    wallet.removeOneAccountByIndex(0)
    expect(wallet.getWalletAccounts().length).toEqual(5)
    wallet.removeOneAccountByAddress(accountFirst.address)
    expect(wallet.getWalletAccounts().length).toEqual(4)
    wallet.cleanAllAccounts()
    expect(wallet.getWalletAccounts().length).toEqual(0)
    const imported = wallet.importAccountFromPrivateKey(testPrivateKey)
    expect(imported.privateKey).toEqual(testPrivateKey)
    wallet.cleanAllAccounts()
    const importedList = wallet.importAccountsFromPrivateKeyList(keyList)
    const getList = wallet.getWalletAccounts()
    expect(getList).toEqual(expect.arrayContaining(importedList))
    try {
      const fakeList = {}
      wallet.importAccountsFromPrivateKeyList(fakeList)
    } catch (error) {
      expect(error.message).toEqual('privateKeyList has to be Array<String>')
    }
    try {
      const fakeAccount = []
      wallet.addAccount(fakeAccount)
    } catch (error) {
      expect(error.message).toEqual('account Object is not correct')
    }
    try {
      wallet.removeOneAccountByAddress('')
    } catch (error) {
      expect(error.message).toEqual('address is not correct')
    }
    try {
      wallet.createAccount()
      wallet.removeOneAccountByIndex('1')
    } catch (error) {
      expect(error.message).toEqual('index is not correct')
    }
    try {
      wallet.getAccountByAddress('')
    } catch (error) {
      expect(error.message).toEqual('address is not correct')
    }
    try {
      wallet.getAccountByIndex('')
    } catch (error) {
      expect(error.message).toEqual('index is not correct')
    }
    try {
      wallet.updateAccountByAddress('', {})
    } catch (error) {
      expect(error.message).toEqual('address is not correct')
    }
    try {
      const tempAccount = wallet.createAccount()
      wallet.updateAccountByAddress(tempAccount.address, '')
    } catch (error) {
      expect(error.message).toEqual('new account Object is not correct')
    }
    wallet.cleanAllAccounts()
    wallet.createBatchAccounts(5)
    expect(wallet.getWalletAddresses().length).toEqual(5)
    expect(wallet.getWalletPrivateKeys().length).toEqual(5)
    expect(wallet.getWalletPublicKeys().length).toEqual(5)
    wallet.cleanAllAccounts()
  })
  it('should be able to encrypt and decrypt wallet', async () => {
    wallet.createBatchAccounts(5)
    await wallet.encryptAllAccounts('123', { kdf: 'scrypt', level: 1024 })
    const encryptedAccounts = wallet.getWalletAccounts()
    expect(encryptedAccounts[0].crypto).toEqual(expect.any(Object))
    await wallet.decryptAllAccounts('123')
    const decryptedAccounts = wallet.getWalletAccounts()
    expect(decryptedAccounts[0].privateKey).toEqual(expect.any(String))
    wallet.cleanAllAccounts()
  })
})
