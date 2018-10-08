import {
  isAddress, isNumber, isObject, isArray
} from 'laksa-utils'
import { Map, List } from 'immutable'

import * as account from 'laksa-account'
import { encryptedBy, ENCRYPTED } from './symbols'

let _accounts = Map({ accounts: List([]) })

class Wallet {
  constructor() {
    this.length = 0
  }

  get accounts() {
    return _accounts.get('accounts').toArray()
  }

  set accounts(value) {
    if (value !== undefined) {
      throw new Error('you should not set "accounts" directly, use internal functions')
    }
  }

  /**
   * [updateLength description]
   * @return {[type]} [description]
   */
  updateLength = () => {
    this.length = this.getIndexKeys().length
  }

  getIndexKeys = () => {
    const isCorrectKeys = n => /^\d+$/i.test(n) && parseInt(n, 10) <= 9e20
    const arrays = _accounts.get('accounts').toArray()
    return Object.keys(arrays).filter(isCorrectKeys)
  }

  getCurrentMaxIndex = () => {
    const diff = (a, b) => {
      return b - a
    }
    // const sorted = R.sort(diff, keyList)
    const sorted = this.getIndexKeys().sort(diff)
    return sorted[0] === undefined ? -1 : parseInt(sorted[0], 10)
  }

  addAccount = (accountObject) => {
    if (!isObject(accountObject)) throw new Error('account Object is not correct')
    const newAccountObject = Object.assign({}, accountObject, {
      createTime: new Date(),
      index: this.getCurrentMaxIndex() + 1
    })
    const objectKey = newAccountObject.address
    const newIndex = newAccountObject.index
    let newArrays = _accounts.get('accounts')
    newArrays = newArrays.set(newIndex, objectKey)
    _accounts = _accounts.set(objectKey, newAccountObject)
    _accounts = _accounts.set('accounts', List(newArrays))
    // _accounts = _accounts.concat(newArrays)
    this.updateLength()
    return {
      ...newAccountObject
    }
  }

  createAccount = () => {
    const accountInstance = new account.Account()
    const accountObject = accountInstance.createAccount()
    return this.addAccount(accountObject)
  }

  createBatchAccounts = (number) => {
    if (!isNumber(number) || (isNumber(number) && number === 0)) throw new Error('number has to be >0 Number')
    const Batch = []
    for (let i = 0; i < number; i += 1) {
      Batch.push(this.createAccount())
    }
    return Batch
  }

  importAccountFromPrivateKey = (privateKey) => {
    const accountInstance = new account.Account()
    const accountObject = accountInstance.importAccount(privateKey)
    return this.addAccount(accountObject)
  }

  importAccountsFromPrivateKeyList = (privateKeyList) => {
    if (!isArray(privateKeyList)) throw new Error('privateKeyList has to be Array<String>')
    const Imported = []
    for (let i = 0; i < privateKeyList.length; i += 1) {
      Imported.push(this.importAccountFromPrivateKey(privateKeyList[i]))
    }
    return Imported
  }

  //-------
  removeOneAccountByAddress = (address) => {
    if (!isAddress(address)) throw new Error('address is not correct')
    const { index } = this.getAccountByAddress(address)
    if (index !== undefined) {
      const currentArray = _accounts.get('accounts').toArray()
      delete currentArray[index]
      _accounts = _accounts.set('accounts', List(currentArray))
      _accounts = _accounts.delete(address)
      this.updateLength()
    }
  }

  removeOneAccountByIndex = (index) => {
    if (!isNumber(index)) throw new Error('index is not correct')
    const addressRef = this.getAccountByIndex(index)
    if (addressRef !== undefined && addressRef.address) {
      this.removeOneAccountByAddress(addressRef.address)
    }
  }

  //---------
  getAccountByAddress = (address) => {
    if (!isAddress(address)) throw new Error('address is not correct')
    return _accounts.get(address)
  }

  getAccountByIndex = (index) => {
    if (!isNumber(index)) throw new Error('index is not correct')
    const address = _accounts.get('accounts').get(index)
    if (address !== undefined) {
      return this.getAccountByAddress(address)
    } else return undefined
  }

  getWalletAddresses = () => {
    return this.getIndexKeys()
      .map((index) => {
        const accountFound = this.getAccountByIndex(parseInt(index, 10))
        if (accountFound) {
          return accountFound.address
        }
        return false
      })
      .filter(d => !!d)
  }

  getWalletPublicKeys = () => {
    return this.getIndexKeys()
      .map((index) => {
        const accountFound = this.getAccountByIndex(parseInt(index, 10))
        if (accountFound) {
          return accountFound.publicKey
        }
        return false
      })
      .filter(d => !!d)
  }

  getWalletPrivateKeys = () => {
    return this.getIndexKeys()
      .map((index) => {
        const accountFound = this.getAccountByIndex(parseInt(index, 10))
        if (accountFound) {
          return accountFound.privateKey
        }
        return false
      })
      .filter(d => !!d)
  }

  getWalletAccounts = () => {
    return this.getIndexKeys()
      .map((index) => {
        const accountFound = this.getAccountByIndex(parseInt(index, 10))
        return accountFound || false
      })
      .filter(d => !!d)
  }

  // -----------

  updateAccountByAddress = (address, newObject) => {
    if (!isAddress(address)) throw new Error('address is not correct')
    if (!isObject(newObject)) throw new Error('new account Object is not correct')
    const newAccountObject = Object.assign({}, newObject, { updatedTime: new Date() })
    _accounts = _accounts.update(address, () => newAccountObject)
    return true
  }

  // -----------
  cleanAllAccounts = () => {
    this.getIndexKeys().forEach(index => this.removeOneAccountByIndex(parseInt(index, 10)))
    return true
  }

  // -----------
  encryptAllAccounts = (password, level) => {
    this.getIndexKeys().forEach((index) => {
      const accountObject = this.getAccountByIndex(parseInt(index, 10))
      if (accountObject) {
        const { address } = accountObject
        this.encryptAccountByAddress(address, password, level, encryptedBy.WALLET)
      }
    })
    return true
  }

  decryptAllAccounts = (password) => {
    this.getIndexKeys().forEach((index) => {
      const accountObject = this.getAccountByIndex(parseInt(index, 10))
      if (accountObject) {
        const { address, LastEncryptedBy } = accountObject
        if (LastEncryptedBy === encryptedBy.WALLET) {
          this.decryptAccountByAddress(address, password, encryptedBy.WALLET)
        } else {
          console.error(`address ${address} is protected by account psw`)
          console.error('use /decryptAccountByAddress/ instead')
        }
      }
    })
    return true
  }

  encryptAccountByAddress = async (address, password, level, by) => {
    const accountObject = this.getAccountByAddress(address)
    if (accountObject !== undefined) {
      const { privateKey, crypto } = accountObject
      if (privateKey !== undefined && privateKey !== ENCRYPTED && crypto === undefined) {
        const encryptedObject = await accountObject.encrypt(password, level)
        return this.updateAccountByAddress(
          address,
          Object.assign({}, encryptedObject, {
            LastEncryptedBy: by || encryptedBy.ACCOUNT
          })
        )
      }
    }
    return false
  }

  decryptAccountByAddress = async (address, password, by) => {
    const accountObject = this.getAccountByAddress(address)
    if (accountObject !== undefined) {
      const { privateKey, crypto } = accountObject

      if (privateKey !== undefined && privateKey === ENCRYPTED && isObject(crypto)) {
        const decryptedObject = await accountObject.decrypt(password)

        return this.updateAccountByAddress(
          address,
          Object.assign({}, decryptedObject, {
            LastEncryptedBy: by || encryptedBy.ACCOUNT
          })
        )
      }
    }
    return false
  }
}

export default Wallet
