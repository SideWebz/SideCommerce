export type LinkedProductOption = {
  id: string;
  name: string;
  brand: string;
  description: string;
};

type LinkedProductsSelectorProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  availableProducts: LinkedProductOption[];
  selectedProducts: LinkedProductOption[];
  onSelect: (product: LinkedProductOption) => void;
  onRemove: (product: LinkedProductOption) => void;
  selectLabel?: string;
  removeLabel?: string;
  emptyAvailableText?: string;
  emptySelectedText?: string;
  selectedTitle?: string;
};

export function LinkedProductsSelector({
  searchQuery,
  onSearchQueryChange,
  availableProducts,
  selectedProducts,
  onSelect,
  onRemove,
  selectLabel = "Select",
  removeLabel = "Remove",
  emptyAvailableText = "No products found.",
  emptySelectedText = "No linked products selected.",
  selectedTitle = "Selected linked products",
}: LinkedProductsSelectorProps) {
  return (
    <div className="border rounded p-3 bg-light-subtle">
      <div className="fw-semibold mb-3">Linked products</div>

      <div className="mb-3">
        <label className="form-label" htmlFor="linked-product-search">Search products</label>
        <input
          id="linked-product-search"
          type="search"
          className="form-control"
          placeholder="Search by name, brand, or description"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
        />
      </div>

      <div className="border rounded bg-white" style={{ maxHeight: "220px", overflowY: "auto" }}>
        {availableProducts.length === 0 ? (
          <div className="p-3 text-secondary small">{emptyAvailableText}</div>
        ) : (
          <ul className="list-group list-group-flush">
            {availableProducts.slice(0, 20).map((product) => (
              <li key={product.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-semibold">{product.name}</div>
                  <div className="small text-secondary">{product.brand}</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-dark" onClick={() => onSelect(product)}>
                  {selectLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <div className="small text-secondary mb-2">{selectedTitle}</div>
        {selectedProducts.length === 0 ? (
          <div className="small text-secondary">{emptySelectedText}</div>
        ) : (
          <ul className="list-group">
            {selectedProducts.map((product) => (
              <li key={product.id} className="list-group-item d-flex justify-content-between align-items-center gap-2">
                <div>
                  <div className="fw-semibold">{product.name}</div>
                  <div className="small text-secondary">{product.brand}</div>
                </div>
                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => onRemove(product)}>
                  {removeLabel}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
