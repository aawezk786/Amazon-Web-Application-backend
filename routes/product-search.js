const router = require('express').Router();

const algoliasearch = require('algoliasearch');
const client = algoliasearch('VK0MC3SDPH', '913e1a20b2540a945e8448232ef522e2');
const index = client.initIndex('amazonium1');

router.get('/', (req, res, next) => {
  if (req.query.query) {
    index.search({
      query: req.query.query,
      page: req.query.page,
    }, (err, content) => {
      res.json({
        success: true,
        message: 'Here is your search',
        status: 200,
        content: content,
        search_result: req.query.query
      });
    });
  }
});

module.exports = router;