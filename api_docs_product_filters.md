# API Documentation: Product Listing Filters

This document describes how to use the product filtering APIs on the BOSS Platform. It covers both the public product search (`GET /api/app/products`) and the seller's personal listings (`GET /api/app/products/seller`).

---

## 1. Setting Up Filters (App Settings)

To retrieve the filters configured by the admin (such as available location ranges), call the settings API:

### `GET /api/app/settings`
**Access**: Public

#### Response Body snippet:
```json
{
  "success": true,
  "data": {
    "platformFees": 0,
    "reportReasons": [
      "Fraud",
      "Abuse",
      "Spam",
      "Fake product"
    ],
    "locationRanges": [
      {
        "id": "range_1",
        "min": 0,
        "max": 5,
        "label": "0 to 5 km"
      },
      {
        "id": "range_2",
        "min": 5,
        "max": 10,
        "label": "5 to 10 km"
      },
      {
        "id": "range_3",
        "min": 10,
        "max": 20,
        "label": "10 to 20 km"
      }
    ],
    "faqs": [
      {
        "_id": "60c72b2f9b1d8b2c8c8b4567",
        "question": "How do I list a product?",
        "answer": "To list a product, click the 'Add Listing' button...",
        "isPublish": true,
        "sortOrder": 1
      }
    ],
    "termsAndConditions": "<h2>Terms of Service</h2>...",
    "about": "<h2>About BOSS Platform</h2>..."
  },
  "message": "App settings fetched successfully"
}
```

*Note: Use the `id` of a location range object (e.g. `"range_1"`) as the `locationRangeId` query parameter in the product search API.*

---

## 2. Product Search Filters API

### `GET /api/app/products`
**Access**: Public

Retrieves a paginated list of approved listings matching the filters.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | No | Page number (default: `1`). |
| `limit` | Integer | No | Page size (default: `10`). |
| `categoryId` | String | No | ID of the Category or Subcategory acting as Category. |
| `subcategoryId` | String | No | ID of the Subcategory (optional, omit if parentless category is selected). |
| `search` | String | No | Case-insensitive search match query for the product name. |
| `minPrice` | Number | No | Filter products with price $\ge$ `minPrice`. |
| `maxPrice` | Number | No | Filter products with price $\le$ `maxPrice`. |
| `lat` | Number | No | Latitude coordinates of the user. Required if using location filters. |
| `lng` | Number | No | Longitude coordinates of the user. Required if using location filters. |
| `locationRangeId`| String | No | The ID of the chosen location range (e.g. `"range_1"`). If `lat` and `lng` are provided, limits results to items between the range's `min` and `max` km boundaries. |
| `radius` | Number | No | Fallback radius in km (legacy support if `locationRangeId` is not sent). |
| **`[customFieldKey]`**| Mixed | No | Any other query parameters will automatically match custom field attributes (e.g. `brand=Apple`, `color=Black`). |

#### Example Request:
```http
GET /api/app/products?categoryId=60c72b2f9b1d8b2c8c8b4501&lat=26.9124&lng=75.7873&locationRangeId=range_2&minPrice=100&maxPrice=1500&brand=Apple
```

---

## 3. Seller's Listings Filters API

### `GET /api/app/products/seller`
**Access**: Protected (Requires Bearer Token)

Retrieves products owned by the authenticated seller. Supports the same rich set of filters.

### Query Parameters

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `page` | Integer | No | Page number (default: `1`). |
| `limit` | Integer | No | Page size (default: `10`). |
| `status` | String | No | Filter listings by status (`pending`, `approved`, `rejected`, `sold`, `inactive`). |
| `categoryId` | String | No | Category ID. |
| `subcategoryId` | String | No | Subcategory ID. |
| `search` | String | No | Search match query for the product name. |
| `minPrice` | Number | No | Filter products with price $\ge$ `minPrice`. |
| `maxPrice` | Number | No | Filter products with price $\le$ `maxPrice`. |
| **`[customFieldKey]`**| Mixed | No | Match custom field attributes (e.g. `brand=Apple`). |

#### Example Request:
```http
GET /api/app/products/seller?status=approved&search=iphone&minPrice=10000&brand=Apple
```

---

## 4. How Location Ranges Filter Works Under the Hood

When a client passes `lat`, `lng`, and `locationRangeId`:
1. The backend finds the corresponding range (e.g., `min: 5` km, `max: 10` km).
2. It translates these boundaries to meters (`min: 5000` m, `max: 10000` m).
3. It performs a MongoDB `$near` query utilizing `$minDistance` and `$maxDistance`:
   ```javascript
   query.geometry = {
     $near: {
       $geometry: {
         type: 'Point',
         coordinates: [lng, lat]
       },
       $minDistance: 5000,
       $maxDistance: 10000
     }
   };
   ```
4. This ensures listings closer than `5 km` or further than `10 km` are excluded, delivering precise results.
