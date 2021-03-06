if(Meteor.isClient) {

	Template.todo.onRendered(function() {
		if(this.createdAt === undefined) {
			this.firstNode.querySelector('input').focus();
		}
	});

	Template.todo.helpers({
		editable: function() {
			return !this.editing ? 'readonly' : '';
		},
		state: function() {
			return this.state;
		}
	});

	Template.todo.events({
		// Remove todo
		'click button': function() {
			todoRemove(this._id);
		},
		// Change the todo state (completede|incomplete)
		'mouseup input': function(e) {
			var self = this;
			var debounce = Session.get('clickDebounce');
			clearTimeout(debounce);

			/**
			 * Add a a debounce to prevent changing state on dblclick
			 */
			Session.set('clickDebounce', setTimeout(function() {
				if(Session.get('isEditing')) {
					return;
				}

				var state = self.state === 'completed' ? 'incomplete' : 'completed';
				Session.set('state', state);

				Items.update(self._id, {$set:{state: Session.get('state')}});
			}, 150));
		},
		// Change editing mode, and set focus
		'dblclick input': function(event) {
			Session.set('isEditing', true);
			Items.update(this._id, {$set:{editing: Session.get('isEditing')}});
			setTimeout(function() {
				event.currentTarget.focus();
			}, 100);
		},
		/**
		 * - Update title on keyup
		 * - Leave editing mode on esc / blur - if empty, remove
		 * - Toggle editing mode on enter. If leaving, find next element (todo||add button)
		 * - If anything else, besides arrwos - enter editing mode
		 */
		'keyup input, blur input': function(event, template) {
			var self = this;
			var isEditing = Session.get('isEditing');
			var debounce = Session.get('debounce');

			// Set title
			self.title = event.currentTarget.value;

			clearTimeout(debounce);
			Session.set('debounce', setTimeout(function() {
				// Update title
				Items.update(self._id, {$set:{title:event.currentTarget.value}});
			}, 150));

			// Exit on escape + blur
			if(event.which === 27 || event.type === 'focusout') {
				Session.set('isEditing', false);
				Items.update(this._id, {$set:{editing: false}});

				if(!this.title) {
					todoRemove(this._id);
				}

			// Toggle on enter
			} else if(event.which === 13) {
				Session.set('isEditing', !isEditing);
				Items.update(this._id, {$set:{editing: !isEditing}});

				if(isEditing) {
					nextTodoItem(event.currentTarget);
				}

			// if not arrow keys - start editing
			} else if(!isEditing && [37, 38, 39, 40].indexOf(event.which) === -1) {
				Session.set('isEditing', true);
				Items.update(this._id, {$set:{editing: true}});
			}
		}
	});
}


/**
 * Removes a todo item, and all
 * the references
 *
 * @param {string} id
 */
function todoRemove(id) {
	Items.find({items: {$in: [id]}}).map(function(item){
		Items.update(item._id, {$pull: {items: id}});
		Items.remove(id);
	});
}

/**
 * Finds the nearest input item
 * Either a todo item or an add-item button from parent list
 *
 * @param {node} element
 * @return {node}
 */
function nextTodoItem(element) {
	var parent = element.parentElement;
	var sibling = parent.nextElementSibling;

	if(/add-item/g.test(sibling.className)) {
		return sibling.click();
	} else if(/todo-item/g.test(sibling.className)) {
		return sibling.querySelector('.todo').focus();
	}
}
