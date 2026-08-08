const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validate');
const {
  createTodoSchema,
  updateTodoSchema,
  reorderSchema,
  bulkUpdateSchema,
  bulkDeleteSchema,
} = require('../validation/todoValidation');
const {
  getTodos,
  createTodo,
  updateTodo,
  bulkUpdateTodos,
  deleteTodo,
  bulkDeleteTodos,
  reorderTodos,
  getStats,
} = require('../controllers/todoControllers');

// All todo routes are private - requires a valid JWT
router.use(protect);

router.route('/')
  .get(getTodos)                       // GET /api/todos
  .post(validate(createTodoSchema), createTodo); // POST /api/todos

// Named routes must come before /:id
router.get('/stats', getStats);                              // GET /api/todos/stats
router.put('/reorder', validate(reorderSchema), reorderTodos); // PUT /api/todos/reorder
router.put('/bulk', validate(bulkUpdateSchema), bulkUpdateTodos); // PUT /api/todos/bulk
router.delete('/bulk', validate(bulkDeleteSchema), bulkDeleteTodos); // DELETE /api/todos/bulk

router.route('/:id')
  .put(validate(updateTodoSchema), updateTodo)    // PUT /api/todos/:id
  .delete(deleteTodo);                            // DELETE /api/todos/:id

module.exports = router;
