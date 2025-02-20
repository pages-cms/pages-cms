const applyFilters = (items: any[], filters: any[]) => {
  if (!items) return [];

  const hasMatchingChild = (item: any): boolean => {
    if (item.type === "file") {
      return filters.every(filter => 
        item.object[filter.name] === filter.value
      );
    }

    return item.children.some(hasMatchingChild);
  };

  return items.filter(item => {
    return hasMatchingChild(item);
  }).map(item => {
    if (item.type === "file") {
      return item;
    }

    return {
      ...item,
      indexFile: item.children.find(child => child.type === "file" && child.name === "index.md"),
      type: hasMatchingChild(item) ? "fileDir" : item.type
    }
  });
};

export {
  applyFilters
};