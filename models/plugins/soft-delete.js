/**
 * Mongoose plugin that adds soft delete functionality to a schema.
 *
 * @function softDeletePlugin
 * @param {mongoose.Schema} schema - The Mongoose schema to apply the soft delete plugin to.
 * @returns {void}
 */
export default function softDeletePlugin(schema) {
  schema.add({
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  });

  schema.methods.softDelete = function (cb) {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.save(cb);
  };

  // TODO: figure out a way to override this method
  // schema.method(
  //   "remove",
  //   function (cb) {
  //     this.softDelete(cb);
  //   },
  //   { suppressWarning: true }
  // );
}
