var express = require('express');
var router = express.Router();
const util = require('util');
const fs = require('fs');

const systemConfig = require(__path_configs + 'system');
const notify = require(__path_configs + 'notify');
const ItemsModel = require(__path_schemas + 'items');
const ValidateItems = require(__path_validates + 'items');
const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const FileHelpers = require(__path_helpers + 'file');

const linkIndex = '/' + systemConfig.prefixAdmin + '/items/';
const pageTitleIndex = 'Item Management';
const pageTitleAdd = pageTitleIndex + ' - Add';
const pageTitleEdit = pageTitleIndex + ' - Edit';
const folderView = __path_views + 'pages/items/';
const uploadAvatar = FileHelpers.upload('avatar', 'items');

// List items
router.get('(/status/:status)?', async (req, res, next) => {
	let objWhere = {};
	let keyword = ParamsHelpers.getParam(req.query, 'keyword', '');
	let currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all');
	let statusFilter = await UtilsHelpers.createFilterStatus(currentStatus);

	let pagination = {
		totalItems: 1,
		totalItemsPerPage: 3,
		currentPage: parseInt(ParamsHelpers.getParam(req.query, 'page', 1)),
		pageRanges: 3
	};

	if (currentStatus !== 'all') objWhere.status = currentStatus;
	if (keyword !== '') objWhere.name = new RegExp(keyword, 'i');

	await ItemsModel.count(objWhere).then((data) => {
		pagination.totalItems = data;
	});

	ItemsModel
		.find(objWhere)
		.sort({ ordering: 'asc' })
		.skip((pagination.currentPage - 1) * pagination.totalItemsPerPage)
		.limit(pagination.totalItemsPerPage)
		.then((items) => {
			res.render(`${folderView}list`, {
				pageTitle: pageTitleIndex,
				items,
				statusFilter,
				pagination,
				currentStatus,
				keyword
			});
		});
});

// Change status
router.get('/change-status/:id/:status', (req, res, next) => {
	let currentStatus = ParamsHelpers.getParam(req.params, 'status', 'active');
	let id = ParamsHelpers.getParam(req.params, 'id', '');
	let status = (currentStatus === "active") ? "inactive" : "active";

	let data = {
		status: status,
		modified: {
			user_id: 0,
			user_name: 0,
			time: Date.now()
		}
	}

	ItemsModel.updateOne({ _id: id }, data, (err, result) => {
		//req.flash('success', notify.CHANGE_STATUS_SUCCESS, false);
		// res.redirect(linkIndex);
	});
	res.send({status,id})
});

// Change status - Multi
router.post('/change-status/:status', (req, res, next) => {
	let currentStatus = ParamsHelpers.getParam(req.params, 'status', 'active');
	ItemsModel.updateMany({ _id: { $in: req.body.cid } }, { status: currentStatus }, (err, result) => {
		req.flash('success', util.format(notify.CHANGE_STATUS_MULTI_SUCCESS, result.n), false);
		res.redirect(linkIndex);
	});
});

// Change ordering - Multi
router.post('/change-ordering', (req, res, next) => {
	let cids = req.body.cid;
	let orderings = req.body.ordering;

	if (Array.isArray(cids)) {
		cids.forEach((item, index) => {
			let data = {
				ordering: parseInt(orderings[index]),
				modified: {
					user_id: 0,
					user_name: 0,
					time: Date.now()
				}
			}

			ItemsModel.updateOne({ _id: item }, data, (err, result) => { });
		})
	} else {
		let data = {
			ordering: parseInt(orderings),
			modified: {
				user_id: 0,
				user_name: 0,
				time: Date.now()
			}
		}
		ItemsModel.updateOne({ _id: cids }, data, (err, result) => { });
	}

	// req.flash('success', notify.CHANGE_ORDERING_SUCCESS, false);
	// res.redirect(linkIndex);
	res.send({orderings,id})
});

// Delete
router.get('/delete/:id', async (req, res, next) => {
	let id = ParamsHelpers.getParam(req.params, 'id', '');

	await ItemsModel.findById(id).then((item) => {
		let path = 'public/uploads/items/'+ item.image;
		if(fs.existsSync(path)){
			fs.unlink(path ,(err)=>{if(err) throw err;});
		}
	});

	ItemsModel.deleteOne({ _id: id }, (err, result) => {
		req.flash('success', notify.DELETE_SUCCESS, false);
		res.redirect(linkIndex);
	});
});

// Delete - Multi
router.post('/delete', async (req, res, next) => {
	// for(let i=0; i<id.length; i++){
	// 	await ItemsModel.findById(id).then((item) => {

	// 		fs.unlink('public/uploads/items/'+ item.image ,(err)=>{if(err) throw err;});
	// 	}); 
	// }

	ItemsModel.remove({ _id: { $in: req.body.cid } }, (err, result) => {
		req.flash('success', util.format(notify.DELETE_MULTI_SUCCESS, result.n), false);
		res.redirect(linkIndex);
	});
});

// FORM
router.get(('/form(/:id)?'), (req, res, next) => {
	let id = ParamsHelpers.getParam(req.params, 'id', '');
	let item = { name: '', ordering: 0, status: 'novalue' };
	let errors = null;
	if (id === '') { // ADD
		res.render(`${folderView}form`, { pageTitle: pageTitleAdd, item, errors });
	} else { // EDIT
		ItemsModel.findById(id, (err, item) => {
			res.render(`${folderView}form`, { pageTitle: pageTitleEdit, item, errors });
		});
	}
});

// SAVE = ADD EDIT
router.post('/save', (req, res, next) => {
	uploadAvatar(req, res, async (errUpload) => {
		req.body = JSON.parse(JSON.stringify(req.body));
		ValidateItems.validator(req);
		console.log('value:', req.body)
		let item = Object.assign(req.body);
		let errors = req.validationErrors();

		if (typeof item !== "undefined" && item.id !== "") {	// edit
			if (errors) {
				res.render(`${folderView}form`, { pageTitle: pageTitleEdit, item, errors });
			} else {
				ItemsModel.updateOne({ _id: item.id }, {
					ordering: parseInt(item.ordering),
					name: item.name,
					image: req.file.filename,
					status: item.status,
					content: item.content,
					modified: {
						user_id: 0,
						user_name: 0,
						time: Date.now(),
					}
				}, (err, result) => {
					req.flash('success', notify.EDIT_SUCCESS, false);
					res.redirect(linkIndex);
				});
			}
		} else { // add
			if (errors) {
				res.render(`${folderView}form`, { pageTitle: pageTitleAdd, item, errors });
			} else {
				// console.log('value:', req.file)
				// return
				// if(req.file == undefined){// khong upload lai hinh
				// 	item.image = item.image_old;

				// }else{

					item.image = req.file.filename;
				// 	let id = ParamsHelpers.getParam(req.params, 'id', '');

				// 	await ItemsModel.findById(id).then((item) => {
				// 		let path = 'public/uploads/items/'+ item.image_old;
				// 		if(fs.existsSync(path)){
				// 			fs.unlink(path ,(err)=>{if(err) throw err;});
				// 		}
				// 	});
				// }


				// console.log('value:', item.image)
				item.created = {
					user_id : 0,
					user_name : "admin",
					time: Date.now()
				}
				new ItemsModel(item).save().then(() => {
					req.flash('success', notify.ADD_SUCCESS, false);
					res.redirect(linkIndex);
				})
			}
		}
	});
});

module.exports = router;
