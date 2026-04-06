# GRC Platform Backend

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file from example:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grc_platform
```

4. Start MongoDB locally or use MongoDB Atlas.

5. Run the server:
```bash
npm run dev
```

6. Seed default config data:
```bash
curl -X POST http://localhost:5000/api/config/seed/defaults
```

## API Endpoints

### Assets
- `GET /api/assets` - Get all assets
- `GET /api/assets/:id` - Get single asset
- `POST /api/assets` - Create asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Risks
- `GET /api/risks` - Get all risks
- `GET /api/risks/:id` - Get single risk
- `POST /api/risks` - Create risk (auto-calculates RIR, TV, controls)
- `PUT /api/risks/:id` - Update risk
- `DELETE /api/risks/:id` - Delete risk

### Controls
- `GET /api/controls` - Get all controls
- `POST /api/controls` - Create control
- `PUT /api/controls/:id` - Update control
- `DELETE /api/controls/:id` - Delete control

### Treatments
- `GET /api/treatments` - Get all treatments
- `POST /api/treatments` - Create treatment
- `PUT /api/treatments/:id` - Update treatment
- `DELETE /api/treatments/:id` - Delete treatment

### Config (Master Data)
- `GET /api/config/:type` - Get configs by type
- `POST /api/config` - Create config
- `PUT /api/config/:id` - Update config
- `DELETE /api/config/:id` - Soft delete config
- `POST /api/config/seed/defaults` - Seed default data

Config types: `asset_category`, `asset_classification`, `asset_type`, `retention_period`, `department`, `location`, `risk_category`, `risk_subcategory`, `risk_owner`, `asset_id_format`
