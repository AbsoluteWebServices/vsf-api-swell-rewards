import { apiStatus } from '../../../lib/util'
import { Router } from 'express'
import PlatformFactory from '../../../platform/factory'

module.exports = ({ config, db }) => {
  let swellApi = Router()

  const _getUserProxy = (req) => {
    const platform = config.platform
    const factory = new PlatformFactory(config, req)
    return factory.getAdapter(platform, 'user')
  }

  const getUser = (req, res) => {
    const userProxy = _getUserProxy(req)
    return new Promise((resolve, reject) => {
      userProxy.me(req.query.token).then(user => {
        resolve(user)
      }).catch(err => {
        apiStatus(res, err, 500)
        reject(err)
      })
    })
  }

  /**
   * V1
   */
  /**
   * Identify Referrer
   *
   * This method takes an email address as a string to identify the email to attribute referred emails to.
   * This is useful if you are building a custom referral program experience in which logged out customers can still participate.
   */
  swellApi.get('/customer_details', (req, res) => {
    if (!req.query.customer_email) {
      apiStatus(res, 'Customer Email required.', 400)
      return
    }

    let request = require('request')
    request({
      url: config.extensions.swellRewards.apiUrl.v1 + '/customer_details',
      method: 'GET',
      qs: {
        customer_email: req.query.customer_email,
        merchant_id: config.extensions.swellRewards.merchantId
      }
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body

        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  /**
   * Send Referral Emails
   *
   * This method takes an array of email addresses to send the referral email share email to.
   * This is useful if you are building a custom referral program experience and want your customer to be able to share his referral link with his or her friends via email.
   */
  swellApi.post('/referral_email_shares', (req, res) => {
    let data = req.body

    if (!data.customer_email) {
      apiStatus(res, 'Customer Email is required.', 400)
      return
    }

    let request = require('request')

    request({
      url: config.extensions.swellRewards.apiUrl.v1 + '/referral_email_shares',
      method: 'POST',
      json: true,
      body: {
        emails: data.emails,
        customer_email: data.customer_email,
        merchant_id: config.extensions.swellRewards.merchantId
      }
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        apiStatus(res, body, response.statusCode)
      }
    })
  })

  /**
   * V2
   */
  /**
   * Record a Customer Action
   *
   * This endpoint records an action performed by a customer.
   * It will apply the action to all matching active campaigns and award the necessary points and/or discounts.
   */
  swellApi.post('/actions', (req, res) => {
    getUser(req, res).then(user => {
      let data = req.body

      data.customer_email = user.email
      data.customer_id = user.id

      let request = require('request')

      request({
        url: config.extensions.swellRewards.apiUrl.v2 + '/actions',
        method: 'POST',
        headers: {
          'x-guid': config.extensions.swellRewards.guid,
          'x-api-key': config.extensions.swellRewards.apiKey
        },
        json: true,
        body: Object.assign({}, data, {ip_address: req.ip})
      }, (error, response, body) => {
        if (error) {
          apiStatus(res, error, 500)
        } else {
          let json = body

          if (typeof json === 'string') {
            json = JSON.parse(json)
          }
          apiStatus(res, json, response.statusCode)
        }
      })
    })
  })

  /**
   * Create/Update Customer Records
   *
   * This endpoint both creates and updates a customer’s record in the Swell system.
   * Use this primarily to notify Swell when you add a customer manually in your admin,
   * or a customer changes their email address.
   */
  swellApi.post('/customers', (req, res) => {
    getUser(req, res).then(user => {
      let data = req.body

      if (!data.first_name) {
        apiStatus(res, 'First name is required.', 400)
        return
      }

      if (!data.last_name) {
        apiStatus(res, 'Last name is required.', 400)
        return
      }

      data.id = user.id
      data.email = user.email

      let request = require('request')

      request({
        url: config.extensions.swellRewards.apiUrl.v2 + '/customers',
        method: 'POST',
        headers: {
          'x-guid': config.extensions.swellRewards.guid,
          'x-api-key': config.extensions.swellRewards.apiKey
        },
        json: true,
        body: data
      }, (error, response, body) => {
        if (error) {
          apiStatus(res, error, 500)
        } else {
          apiStatus(res, body, response.statusCode)
        }
      })
    })
  })

  /**
   * Set Customer Birthday
   */
  swellApi.post('/customer_birthdays', (req, res) => {
    getUser(req, res).then(user => {
      let data = req.body

      if (!data.day || !data.month || !data.year) {
        apiStatus(res, 'Date is required.', 400)
        return
      }

      data.customer_email = user.email

      let request = require('request')

      request({
        url: config.extensions.swellRewards.apiUrl.v2 + '/customer_birthdays',
        method: 'POST',
        headers: {
          'x-guid': config.extensions.swellRewards.guid,
          'x-api-key': config.extensions.swellRewards.apiKey
        },
        json: true,
        body: data
      }, (error, response, body) => {
        if (error) {
          apiStatus(res, error, 500)
        } else {
          apiStatus(res, body, response.statusCode)
        }
      })
    })
  })

  /**
   * Fetch All Customers
   *
   * Fetches a list of customers and customer data registered in the Yotpo Loyalty database.
   * Use the last_seen_at parameter to retrieve active customers since a specific date (YYYY-MM-DD).
   */
  swellApi.get('/customers/all', (req, res) => {
    let request = require('request')

    request({
      url: config.extensions.swellRewards.apiUrl.v2 + '/customers/all',
      method: 'GET',
      headers: {
        'x-guid': config.extensions.swellRewards.guid,
        'x-api-key': config.extensions.swellRewards.apiKey
      },
      qs: req.query
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body

        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  /**
   * Fetch Customer Details
   *
   * This endpoint returns a Swell customer record.
   * Most commonly used to fetch a customer’s point balance and unique referral link.
   */
  swellApi.get('/customers', (req, res) => {
    getUser(req, res).then(user => {
      let request = require('request')

      request({
        url: config.extensions.swellRewards.apiUrl.v2 + '/customers',
        method: 'GET',
        headers: {
          'x-guid': config.extensions.swellRewards.guid,
          'x-api-key': config.extensions.swellRewards.apiKey
        },
        qs: Object.assign({}, req.query, {
          customer_id: user.id,
          customer_email: user.email
        })
      }, (error, response, body) => {
        if (error) {
          apiStatus(res, error, 500)
        } else {
          let json = body

          if (typeof json === 'string') {
            json = JSON.parse(json)
          }
          apiStatus(res, json, response.statusCode)
        }
      })
    })
  })

  /**
   * Create Redemption
   *
   * This endpoint will redeem a customer’s points for a particular redemption option.
   * It will check to ensure the customer is eligible and has enough points
   * for the selected redemption option and then it will deduct the points from their balance,
   * generate the coupon code, and return it in the response.
   */
  swellApi.post('/redemptions', (req, res) => {
    getUser(req, res).then(user => {
      let data = req.body

      if (!data.redemption_option_id) {
        apiStatus(res, 'Redemption option ID is required.', 400)
        return
      }

      data.customer_external_id = user.id
      data.customer_email = user.email

      let request = require('request')

      request({
        url: config.extensions.swellRewards.apiUrl.v2 + '/redemptions',
        method: 'POST',
        headers: {
          'x-guid': config.extensions.swellRewards.guid,
          'x-api-key': config.extensions.swellRewards.apiKey
        },
        json: true,
        body: data
      }, (error, response, body) => {
        if (error) {
          apiStatus(res, error, 500)
        } else {
          let json = body

          if (typeof json === 'string') {
            json = JSON.parse(json)
          }
          apiStatus(res, json, response.statusCode)
        }
      })
    })
  })

  /**
   * Fetch Active Redemption Options
   *
   * This endpoint returns a list of redemption options available for customers to redeem.
   */
  swellApi.get('/redemption_options', (req, res) => {
    let request = require('request')

    request({
      url: config.extensions.swellRewards.apiUrl.v2 + '/redemption_options',
      method: 'GET',
      headers: {
        'x-guid': config.extensions.swellRewards.guid,
        'x-api-key': config.extensions.swellRewards.apiKey
      }
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body

        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  /**
   * Get Redemption Code Data
   *
   * This endpoint lets you fetch the email address of a customer who redeemed a discount
   * by providing a third party_id or the discount code.
   * This enables merchants to validate (at checkout) if the shopper placing the order
   * is different than the shopper who redeemed and used the discount.
   */
  swellApi.get('/redemption_codes', (req, res) => {
    if (!req.query.third_party_id && !req.query.code) {
      apiStatus(res, 'Third-party Id or Code required.', 400)
      return
    }

    let request = require('request')

    request({
      url: config.extensions.swellRewards.apiUrl.v2 + '/redemption_codes',
      method: 'GET',
      headers: {
        'x-guid': config.extensions.swellRewards.guid,
        'x-api-key': config.extensions.swellRewards.apiKey
      },
      qs: req.query
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body

        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  /**
   * Get Active Campaigns
   *
   * This endpoint returns a list of campaigns available for customers to participate in.
   * If you provide a particular customer we can return their current status and eligibility on each of the campaigns.
   */
  swellApi.get('/campaigns', async (req, res) => {
    let qs = req.query

    if (qs.with_status) {
      const user = await getUser(req, res)

      qs.customer_id = user.id
      qs.customer_email = user.email
    }

    let request = require('request')

    request({
      url: config.extensions.swellRewards.apiUrl.v2 + '/campaigns',
      method: 'GET',
      headers: {
        'x-guid': config.extensions.swellRewards.guid,
        'x-api-key': config.extensions.swellRewards.apiKey
      },
      qs
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body

        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  /**
   * Fetch VIP Tiers
   */
  swellApi.get('/vip_tiers', (req, res) => {
    let request = require('request')
    request({
      url: config.extensions.swellRewards.apiUrl.v2 + '/vip_tiers',
      method: 'GET',
      headers: {
        'x-guid': config.extensions.swellRewards.guid,
        'x-api-key': config.extensions.swellRewards.apiKey
      }
    }, (error, response, body) => {
      if (error) {
        apiStatus(res, error, 500)
      } else {
        let json = body
        if (typeof json === 'string') {
          json = JSON.parse(json)
        }
        apiStatus(res, json, response.statusCode)
      }
    })
  })

  return swellApi
}
