var express = require('express');
var router = express.Router();
const util = require('util');
const fs = require('fs');
const col = "users"

const systemConfig = require(__path_configs + 'system');
const notify = require(__path_configs + 'notify');
const ItemsModel = require(__path_schemas + col);
// const UsersModel 	= require(__path_models + 'users');
const GroupsModel 	= require(__path_models + 'groups');
const ValidateItems = require(__path_validates + col);
const UtilsHelpers = require(__path_helpers + 'utils');
const ParamsHelpers = require(__path_helpers + 'params');
const FileHelpers = require(__path_helpers + 'file');

const linkIndex = '/' + systemConfig.prefixAdmin + `/${col}/`;
console.log('value:', linkIndex)
const pageTitleIndex = 'User Management';
const pageTitleAdd = pageTitleIndex + ' - Add';
const pageTitleEdit = pageTitleIndex + ' - Edit';
const folderView = __path_views + `pages/${col}/`;

// List items
router.get('(/status/:status)?', async (req, res, next) => {
	let objWhere = {};
	let keyword = ParamsHelpers.getParam(req.query, 'keyword', '');
	let currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all');
	let statusFilter = await UtilsHelpers.createFilterStatus(currentStatus,col);

	let pagination = {
		totalItems: 1,
		totalItemsPerPage: 5,
		currentPage: parseInt(ParamsHelpers.getParam(req.query, 'page', 1)),
		pageRanges: 3
	};

	if (currentStatus !== 'all') objWhere.status = currentStatus;
	if (keyword !== '') objWhere.name = new RegExp(keyword, 'i');

	await ItemsModel.count(objWhere).then((data) => {
		pagination.totalItems = data;
	});

	console.log('value:', statusFilter)

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

// Change ordering
router.get('/change-ordering/:id/:ordering', (req, res, next) => {
	console.log( 123)
	let id = ParamsHelpers.getParam(req.params, 'id', '');
	console.log('value:', id)
	let ordering = ParamsHelpers.getParam(req.params, 'ordering', 1);
	console.log('value:', ordering)

	let data = {
		ordering: ordering,
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
	res.send({ordering,id})
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

	ItemsModel.deleteOne({ _id: id }, (err, result) => {
		req.flash('success', notify.DELETE_SUCCESS, false);
		res.redirect(linkIndex);
	});
});

// Delete - Multi
router.post('/delete', async (req, res, next) => {

	ItemsModel.remove({ _id: { $in: req.body.cid } }, (err, result) => {
		req.flash('success', util.format(notify.DELETE_MULTI_SUCCESS, result.n), false);
		res.redirect(linkIndex);
	});
});

// FORM
router.get(('/form(/:id)?'), async (req, res, next) => {
	let id = ParamsHelpers.getParam(req.params, 'id', '');
	let item	= {name: '', ordering: 0, status: 'novalue', group_id: '', group_name: ''};
	let errors = null;
	let groupsItems	= [];
	await GroupsModel.listItemsInSelectbox().then((items)=> {
		groupsItems = items;
		groupsItems.unshift({_id: 'allvalue', name: 'All group'});
	});

	if (id === '') { // ADD
		res.render(`${folderView}form`, { pageTitle: pageTitleAdd, item, errors, groupsItems});
	} else { // EDIT
		ItemsModel.findById(id, (err, item) => {
			item.group_id = item.group.id;
			item.group_name = item.group.name;
			res.render(`${folderView}form`, { pageTitle: pageTitleEdit, item, errors, groupsItems});
		});
	}
});

// SAVE = ADD EDIT
router.post('/save', async (req, res, next) => {
		req.body = JSON.parse(JSON.stringify(req.body));
		ValidateItems.validator(req);
		console.log('value:', req.body)
		let item = Object.assign(req.body);
		let errors = req.validationErrors();

		if (typeof item !== "undefined" && item.id !== "") {	// edit
			if (errors) {
				let groupsItems	= [];
				await GroupsModel.listItemsInSelectbox().then((items)=> {
					groupsItems = items;
					groupsItems.unshift({_id: 'allvalue', name: 'All group'});
				});
				res.render(`${folderView}form`, { pageTitle, item, errors, groupsItems});
			} else {
				ItemsModel.updateOne({ _id: item.id }, {
					ordering: parseInt(item.ordering),
					name: item.name,
					status: item.status,
					content: item.content,
					modified: {
						group_id: 0,
						group_name: 0,
						time: Date.now(),
					}
				}, (err, result) => {
					req.flash('success', notify.EDIT_SUCCESS, false);
					res.redirect(linkIndex);
				});
			}
		} else { // add
			if (errors) {
				let groupsItems	= [];
				await GroupsModel.listItemsInSelectbox().then((items)=> {
					groupsItems = items;
					groupsItems.unshift({_id: 'allvalue', name: 'All group'});
				});
				res.render(`${folderView}form`, { pageTitle, item, errors, groupsItems});
			} else {
				item.created = {
					group_id : 0,
					group_name : "admin",
					time: Date.now()
				}
				new ItemsModel(item).save().then(() => {
					req.flash('success', notify.ADD_SUCCESS, false);
					res.redirect(linkIndex);
				})
			}
		}
});

module.exports = router;
