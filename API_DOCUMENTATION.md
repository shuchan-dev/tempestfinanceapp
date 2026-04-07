# Tempest Finance PWA - API Documentation

## 1. Authentication
Endpoints for logging in and registering. These endpoints are protected by an in-memory dual-layer rate limiter (5 attempts / 15 minutes).

### `POST /api/auth/login`
- **Desc**: Login and get session cookie.
- **Body**: `{ "name": "string", "pin": "string (6-digit)" }`
- **Response**:
  - `200 OK`: `{ "success": true, "message": "Login berhasil", "name": "..." }`
  - `401 Unauthorized`: Invalid PIN.
  - `403 Forbidden`: Account not approved yet.
  - `404 Not Found`: Name not found.
  - `429 Too Many Requests`: Rate limit exceeded.

### `POST /api/auth/register`
- **Desc**: Register a new user.
- **Body**: `{ "name": "string", "pin": "string (6-digit)" }`
- **Response**:
  - `201 Created`: `{ "success": true, "message": "Pendaftaran berhasil..." }`
  - `400 Bad Request`: Invalid input or name exists.
  - `429 Too Many Requests`: Rate limit exceeded.

---

## 2. Accounts
Operates on the user's financial accounts and "Kantong" (sub-accounts).

### `GET /api/accounts`
- **Desc**: Fetch all accounts belonging to the user.
- **Response**: `200 OK` array of `AccountData` including nested `children`.

### `POST /api/accounts`
- **Desc**: Create a new account or sub-account.
- **Body**: `{ "name": "string", "balance": "number?", "parentId": "string?", "icon": "string?", "color": "string?" }`
- **Response**: `201 Created`

### `DELETE /api/accounts?id={id}`
- **Desc**: Soft Delete an account. Saldo must be 0, and no Uang Goib.
- **Response**: `200 OK`

---

## 3. Categories
Standardizing Income & Expense classification. Max nesting depth is 3.

### `GET /api/categories?type=EXPENSE&nested=true`
- **Desc**: Support flat or nested tree structures. Filter by active/soft-deleted.
- **Response**: `200 OK` array of `CategoryData`

### `POST /api/categories`
- **Desc**: Max nesting is 3 levels deep.

### `DELETE /api/categories?id={id}`
- **Desc**: Soft delete a category. Fails if category has children.

---

## 4. Budgets
Tracks target spending against a category.

### `GET /api/budgets`
- **Desc**: Fetch budgets with computed properties (`spent`, `remaining`, `percentage`).
- **Response**: `200 OK` flat array of Budgets.

### `POST /api/budgets`
- **Desc**: Upserts a budget limit.

### `DELETE /api/budgets?id={id}`
- **Desc**: Soft deletes a budget item.

---

## 5. Transactions
Tracks income, expenses, and transfers.

### `GET /api/transactions?limit=20&page=1`
- **Desc**: Paginated list. Soft-deleted items are excluded.
- **Response**: `200 OK` array.

### `POST /api/transactions`
- **Desc**: Creates transaction atomatically using service layer.

---

## 6. Debts
Record debts and receivables.

### `GET /api/debts`
- **Desc**: Supports filters `type` and `isPaid`.
- **Response**: `200 OK` array containing `payments`.

### `POST /api/debts`
- **Desc**: Creates new debt record.

### `PATCH /api/debts?id={id}`
- **Desc**: Edits or marks as paid.

### `DELETE /api/debts?id={id}`
- **Desc**: Soft deletes debt record.

### `POST /api/debts/payments`
- **Desc**: Logs an installment. Resolves debt if fully paid.

### `DELETE /api/debts/payments?id={id}`
- **Desc**: Soft deletes a payment. Under-resolves debt if needed.
