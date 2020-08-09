const router = require('express').Router();
const async = require('async');
const stripe = require('stripe')('YourStripeKey');

const Category = require('../models/category');
const Product = require('../models/product');
const Review = require('../models/review');
const Order = require('../models/order');

const checkJWT = require('../middlewares/check-jwt');

router.get('/products', (req, res, next) => {
  const perPage= 10;
  const page = req.query.page;

  async.parallel([
    function(callback) {
      Product.count({}, (err, count) => {
        let totalProducts = count;
        callback(err, totalProducts);
      });
    },
    function(callback) {
      Product.find({})
        .skip(perPage * page)
        .limit(perPage)
        .populate('category')
        .populate('owner')
        .exec((err, products) => {
          if (err) return next(err);
          callback(err, products);
        });
    }
  ], function(err, results) {
    let totalProducts = results[0];
    let products = results[1];
    res.json({
      success: true,
      message: 'category',
      products: products,
      totalProducts: totalProducts,
      pages: Math.ceil(totalProducts / perPage)
    });
  });

});

router.route('/categories')
  .get((req, res, next) => {
    Category.find({}, (err, categories) => {
      res.json({
        success: true,
        message: 'Success',
        categories: categories
      })
    })
  })
  .post((req, res, next) => {
    let category = new Category();
    category.name = req.body.category;
    category.save();
    res.json({
      success: true,
      message: 'Successful'
    });
  });

  router.get('/categories/:id', (req, res, next) => {
    const perPage= 10;
    const page = req.query.page;

    async.parallel([
      function(callback) {
        Product.count({ category: req.params.id }, (err, count) => {
          let totalProducts = count;
          callback(err, totalProducts);
        });
      },
      function(callback) {
        Product.find({ category: req.params.id })
          .skip(perPage * page)
          .limit(perPage)
          .populate('category')
          .populate('owner')
          .populate('review')
          .exec((err, products) => {
            if (err) return next(err);
            callback(err, products);
          });
      },
      function(callback) {
        Category.findOne({ _id: req.params.id }, (err, category) => {
          callback(err, category)
        });
      }
    ], function(err, results) {
      let totalProducts = results[0];
      let products = results[1];
      let category = results[2];
      res.json({
        success: true,
        message: 'category',
        products: products,
        categoryName: category.name,
        totalProducts: totalProducts,
        pages: Math.ceil(totalProducts / perPage)
      });
    });

  });

  router.get('/product/:id', (req, res, next) => {
    Product.findById({ _id: req.params.id })
      .populate('category')
      .populate('owner')
      .deepPopulate('reviews.owner')
      .exec((err, product) => {
        if (err) {
          res.json({
            success: false,
            message: 'Product is not found'
          });
        } else {
          if (product) {
            res.json({
              success: true,
              product: product
            });
          }
        }
      });
  });

  router.post('/review', checkJWT, (req, res, next) => {
    async.waterfall([
      function(callback) {
        Product.findOne({ _id: req.body.productId }, (err, product) => {
          if (product) {
            callback(err, product);
          }
        });
      },
      function(product) {
        let review = new Review();
        review.owner = req.decoded.user._id;

        if (req.body.title) review.title = req.body.title;
        if (req.body.description) review.description = req.body.description
        review.rating = req.body.rating;

        product.reviews.push(review._id);
        product.save();
        review.save();
        res.json({
          success: true,
          message: 'Successfully added the review'
        });
      }
    ]);
  });

  router.post('/payment', checkJWT, (req, res, next) => {
    const stripeToken = req.body.stripeToken;
    const currentCharges = Math.round(req.body.totalPrice * 100);
  
    stripe.customers
      .create({
        source: stripeToken.id
      })
      .then(function(customer) {
        return stripe.charges.create({
          amount: currentCharges,
          currency: 'usd',
          customer: customer.id
        });
      })
      .then(function(charge) {
        const products = req.body.products;

        let order = new Order();
        order.owner = req.decoded.user._id;
        order.totalPrice = currentCharges;

        product.map(product => {
          order.products.push({
            product: product.product,
            quantity: product.quantity
          });
        });

        order.save();
        res.json({
          success: true,
          message: 'Successfully made a payment'
        });
      });
  });

  module.exports = router;