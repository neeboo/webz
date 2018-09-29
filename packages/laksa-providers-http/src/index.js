import axios from 'axios'

class HttpProvider {
  constructor(url, timeout, user, password, headers) {
    this.url = url || 'http://localhost:4200'
    this.timeout = timeout || 0
    this.user = user || null
    this.password = password || null
    this.headers = headers
    this.request = this.instance()
  }

  instance = () => {
    const request = axios.create()
    if (this.user && this.password) {
      const AUTH_TOKEN = `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`
      request.defaults.headers.common.Authorization = AUTH_TOKEN
    }
    request.defaults.headers.post['Content-Type'] = 'application/json'

    if (this.headers) {
      this.headers.forEach((header) => {
        request.defaults.headers.post[header.name] = header.value
      })
    }
    if (this.timeout) {
      request.defaults.timeout = this.timeout
    }
    return request
  }

  send = async (payload) => {
    const result = await this.requestFunc({ payload })
    return result
  }

  sendServer = async (endpoint, payload) => {
    const result = await this.requestFunc({ endpoint, payload })
    return result
  }

  sendAsync = (payload, callback) => {
    this.requestFunc({ payload, callback })
  }

  sendAsyncServer = (endpoint, payload, callback) => {
    this.requestFunc({ endpoint, payload, callback })
  }

  requestFunc = ({ endpoint, payload, callback }) => {
    const dest = endpoint !== null && endpoint !== undefined ? `${this.url}${endpoint}` : this.url
    return this.request
      .post(dest, JSON.stringify(payload))
      .then((response) => {
        const { data, status } = response
        if (data.result && status === 200) {
          if (callback === undefined) {
            return !data.message ? data.result : data
          } else {
            callback(null, !data.message ? data.result : data)
          }
        }
      })
      .catch((err) => {
        if (callback === undefined) {
          return err
        } else {
          callback(err)
        }
      })
  }
}

export default HttpProvider
