/** Author markup used by the focused media and clone regressions. */
export const auditMarkup = {
  nestedLazy: '<a><img data-src="image.jpg"></a>',
  video: '<video></video>',
  form: (index: number) => `<label for="field-${index}">Name</label><input id="field-${index}">`,
};
