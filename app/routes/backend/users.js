var express = require('express');
var router 	= express.Router();
const util = require('util');

const systemConfig  = require(__path_configs + 'system');
const notify  		= require(__path_configs + 'notify');
const UsersModel 	= require(__path_models + 'users');
const GroupsModel 	= require(__path_models + 'groups');
const ValidateUsers	= require(__path_validates + 'users');
const UtilsHelpers 	= require(__path_helpers + 'utils');
const FileHelpers = require(__path_helpers + 'file');
const ParamsHelpers = require(__path_helpers + 'params');

const linkIndex		 = '/' + systemConfig.prefixAdmin + '/users/';
const pageTitleIndex = 'Users Management';
const pageTitleAdd   = pageTitleIndex + ' - Add';
const pageTitleEdit  = pageTitleIndex + ' - Edit';
const folderView	 = __path_views_admin + 'pages/users/';
const uploadAvatar	 = FileHelpers.upload('avatar', 'users');

// List users
router.get('(/status/:status)?', async (req, res, next) => {
	let params 		 = {};
	params.keyword		 = ParamsHelpers.getParam(req.query, 'keyword', '');
	params.currentStatus = ParamsHelpers.getParam(req.params, 'status', 'all'); 
	params.sortField  	 = ParamsHelpers.getParam(req.session, 'sort_field', 'name');
	params.sortType 	 = ParamsHelpers.getParam(req.session, 'sort_type', 'asc');
	params.groupID 		 = ParamsHelpers.getParam(req.session, 'group_id', '');
	params.pagination 	 = {
		totalItems		 : 1,
		totalItemsPerPage: 5,
		currentPage		 : parseInt(ParamsHelpers.getParam(req.query, 'page', 1)),
		pageRanges		 : 3
	};
		
	let statusFilter = await UtilsHelpers.createFilterStatus(params.currentStatus, 'users');

	let groupsItems	= [];
	await GroupsModel.listItemsInSelectbox().then((items)=> {
		groupsItems = items;
		groupsItems.unshift({_id: 'allvalue', name: 'All group'});
	});

	await UsersModel.countItem(params).then( (data) => {
		params.pagination.totalItems = data;
	});
	
	UsersModel.listItems(params)	
		.then( (items) => {
			res.render(`${folderView}list`, { 
				pageTitle: pageTitleIndex,
				items,
				statusFilter,
				groupsItems,
				params
			});
		});
});

// Change status
router.get('/change-status/:id/:status', (req, res, next) => {
	let currentStatus	= ParamsHelpers.getParam(req.params, 'status', 'active'); 
	let id				= ParamsHelpers.getParam(req.params, 'id', ''); 

	UsersModel.changeStatus(id, currentStatus, {task: "update-one"}).then((result)=> {
		req.flash('success', notify.CHANGE_STATUS_SUCCESS, false);
		res.redirect(linkIndex);
	})
});

// Change status - Multi
router.post('/change-status/:status', (req, res, next) => {
	let currentStatus	= ParamsHelpers.getParam(req.params, 'status', 'active'); 

	UsersModel.changeStatus(req.body.cid, currentStatus, {task: "update-multi"}).then((result) => {
		req.flash('success', util.format(notify.CHANGE_STATUS_MULTI_SUCCESS, result.n) , false);
		res.redirect(linkIndex);
	});
});

// Change ordering - Multi
router.post('/change-ordering', (req, res, next) => {
	let cids 		= req.body.cid;
	let orderings 	= req.body.ordering;
	
	UsersModel.changeOrdering(cids, orderings, null).then((result)=>{
		req.flash('success', notify.CHANGE_ORDERING_SUCCESS, false);
		res.redirect(linkIndex);
	});
});

// Delete
router.get('/delete/:id', async (req, res, next) => {
	let id				= ParamsHelpers.getParam(req.params, 'id', ''); 
	UsersModel.deleteItem(id, {task: 'delete-one'} ).then((result) => {
		req.flash('success', notify.DELETE_SUCCESS, false);
		res.redirect(linkIndex);
	});
});

// Delete - Multi
router.post('/delete', (req, res, next) => {
	UsersModel.deleteItem(req.body.cid, {task: 'delete-mutli'} ).then((result) => {
		req.flash('success', util.format(notify.DELETE_MULTI_SUCCESS, result.n), false);
		res.redirect(linkIndex);
	});
});

// FORM
router.get(('/form(/:id)?'), async (req, res, next) => {
	let id		= ParamsHelpers.getParam(req.params, 'id', '');
	let item	= {name: '', ordering: 0, status: 'novalue', group_id: '', group_name: ''};
	let errors   = null;
	let groupsItems	= [];
	await GroupsModel.listItemsInSelectbox().then((items)=> {
		groupsItems = items;
		groupsItems.unshift({_id: 'allvalue', name: 'All group'});
	});
	
	if(id === '') { // ADD
		res.render(`${folderView}form`, { pageTitle: pageTitleAdd, item, errors, groupsItems});
	}else { // EDIT
		UsersModel.getItem(id).then( (item) =>{
			item.group_id = item.group.id;
			item.group_name = item.group.name;
			res.render(`${folderView}form`, { pageTitle: pageTitleEdit, item, errors, groupsItems});
		});	
	}
});

// SAVE = ADD EDIT
router.post('/save',  (req, res, next) => {
	uploadAvatar(req, res, async (errUpload) => {
		req.body = JSON.parse(JSON.stringify(req.body));
		console.log('value:', req.body)

		let item = Object.assign(req.body);
		let taskCurrent	= (typeof item !== "undefined" && item.id !== "" ) ? "edit" : "add";

		let errors = ValidateUsers.validator(req, errUpload, taskCurrent);
		
		if(errors.length > 0) { 
			let pageTitle = (taskCurrent == "add") ? pageTitleAdd : pageTitleEdit;
			if(req.file != undefined) FileHelpers.remove('public/uploads/users/', req.file.filename); // xóa tấm hình khi form không hợp lệ
		
			let groupsItems	= [];
			await GroupsModel.listItemsInSelectbox().then((items)=> {
				groupsItems = items;
				groupsItems.unshift({_id: 'allvalue', name: 'All group'});
			});
			
			if (taskCurrent == "edit") item.avatar = item.image_old;
			res.render(`${folderView}form`, { pageTitle, item, errors, groupsItems});
		}else {
			let message = (taskCurrent == "add") ? notify.EDIT_SUCCESS : notify.EDIT_SUCCESS;
			console.log(req.file.filename )
			if(req.file == undefined){ // không có upload lại hình
				item.avatar = item.image_old;
			}else{
				item.avatar = req.file.filename;
				if(taskCurrent == "edit") FileHelpers.remove('public/uploads/users/', item.image_old);
			}

			UsersModel.saveItem(item, {task: taskCurrent}).then((result) => {
				req.flash('success', message, false);
				res.redirect(linkIndex);
			});
		}
	});
});

// SORT
router.get(('/sort/:sort_field/:sort_type'), (req, res, next) => {
	req.session.sort_field		= ParamsHelpers.getParam(req.params, 'sort_field', 'ordering');
	req.session.sort_type		= ParamsHelpers.getParam(req.params, 'sort_type', 'asc');
	res.redirect(linkIndex);
});

// FILTER GROUP
router.get(('/filter-group/:group_id'), (req, res, next) => {
	req.session.group_id		= ParamsHelpers.getParam(req.params, 'group_id', '');
	res.redirect(linkIndex);
});


module.exports = router;
