// Only explicitly published, non-archived records are public.
export function filterPublicAttractions(attractionData, query) {
  const search = query.q.trim().toLowerCase();
  const selectedCategory = query.category.trim().toLowerCase();

  return attractionData.filter(place => {
    if (place.published !== true || place.archived) return false;
    if (selectedCategory &&
        String(place.category || '').toLowerCase() !== selectedCategory) {
      return false;
    }
    return [place.name, place.area, place.description]
      .some(value => String(value || '').toLowerCase().includes(search));
  });
}
