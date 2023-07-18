const checkAndUpdateAttributes = (productAttributes, categoryAttributes) => {
  const attributesAlreadyInCategory = categoryAttributes.map(
    (attribute) => attribute.key
  );

  const newAttributesToBeAdded = [];
  productAttributes.forEach((productAttribute) => {
    categoryAttributes.forEach((categoryAttribute) => {
      // if the attribute already exists in the category
      // but the new product's attribute value is not in the category we add it
      if (productAttribute.key === categoryAttribute.key) {
        if (!categoryAttribute.value.includes(productAttribute.value)) {
          categoryAttribute.value.push(productAttribute.value);
        }
        // if the attribute doesn't exist in the category we add it (both the key and the value)
      } else if (!attributesAlreadyInCategory.includes(productAttribute.key)) {
        newAttributesToBeAdded.push({
          key: productAttribute.key,
          value: [productAttribute.value],
        });
        attributesAlreadyInCategory.push(productAttribute.key);
      }
    });
  });
  categoryAttributes.push(...newAttributesToBeAdded);
};

module.exports = checkAndUpdateAttributes;
