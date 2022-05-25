var express = require('express');
var router = express.Router();

const folderView	 = __path_views + 'pages/dashboard/';
const ItemsModel 	= require(__path_schemas + 'items');

/* GET dashboard page. */
router.get('/', async(req, res, next) => {

	let countItems = 0;
	await ItemsModel.count({}).then( (data) => {
		countItems = data;
	});

	res.render(`${folderView}index`, { 
		pageTitle: 'Dashboard Page', 
		countItems:countItems
	});
});

module.exports = router;
