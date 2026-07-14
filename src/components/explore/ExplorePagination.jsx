import React from "react";

const ExplorePagination = ({ pagination, onPage }) => {
  if (!pagination || pagination.pages <= 1) return null;
  return <nav className="explore-pagination" aria-label="Repository results pages">
    <button type="button" disabled={!pagination.hasPreviousPage} onClick={() => onPage(pagination.page - 1)}>Previous</button>
    <span>Page {pagination.page} of {pagination.pages}</span>
    <button type="button" disabled={!pagination.hasNextPage} onClick={() => onPage(pagination.page + 1)}>Next</button>
  </nav>;
};
export default ExplorePagination;
