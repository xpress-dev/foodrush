# 🍔 FoodRush - Food Delivery API

A comprehensive REST API for a food delivery application built with Node.js, Express.js, and MongoDB. This API provides all the functionality needed for a complete food delivery platform including user management, restaurant management, order processing, delivery tracking, and review systems.

## 🚀 Features

### 👥 User Management

- User registration and authentication with JWT
- Role-based access control (Customer, Restaurant Owner, Admin)
- Profile management and address management
- Password reset and email verification

### 🏪 Restaurant Management

- Restaurant registration and profile management
- Menu item management with categories
- Opening hours and delivery area configuration
- Restaurant search and filtering
- Real-time status updates (open/closed)

### 🛒 Order Management

- Complete order lifecycle management
- Real-time order tracking
- Payment integration support
- Order history and statistics
- Automatic delivery time estimation

### 🚚 Delivery System

- Delivery partner registration and verification
- Real-time location tracking
- Order assignment and delivery confirmation
- Performance tracking and ratings

### ⭐ Review System

- Multi-dimensional rating system (food, delivery, service)
- Photo uploads for reviews
- Restaurant response capability
- Review moderation and reporting

### 🔧 Additional Features

- Advanced search and filtering
- Geolocation-based restaurant discovery
- Comprehensive error handling
- Rate limiting and security middleware
- Input validation and sanitization

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.0 or higher)
- npm or yarn package manager

## 🛠️ Installation

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd foodrush/backend
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Environment Setup:**

   ```bash
   cp .env.example .env
   ```

   Update the `.env` file with your configuration values.

4. **Start MongoDB:**
   Make sure MongoDB is running on your system.

5. **Run the application:**

   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## 📚 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Authentication

Most endpoints require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Main Endpoints

#### 👤 Users

- `POST /users/register` - Register a new user
- `POST /users/login` - User login
- `GET /users/profile` - Get user profile
- `PUT /users/profile` - Update user profile
- `POST /users/addresses` - Add new address
- `GET /users/addresses` - Get user addresses

#### 🏪 Restaurants

- `GET /restaurants` - Get all restaurants
- `GET /restaurants/nearby` - Get nearby restaurants
- `POST /restaurants` - Create restaurant (Restaurant Owner)
- `GET /restaurants/:id` - Get restaurant details
- `GET /restaurants/:id/menu` - Get restaurant menu

#### 🍽️ Menu Items

- `GET /menu-items` - Get menu items
- `POST /menu-items` - Create menu item (Restaurant Owner)
- `GET /menu-items/:id` - Get menu item details
- `PUT /menu-items/:id` - Update menu item
- `GET /menu-items/search` - Search menu items

#### 📦 Orders

- `POST /orders` - Create new order
- `GET /orders/my-orders` - Get user orders
- `GET /orders/:id` - Get order details
- `PUT /orders/:id/status` - Update order status
- `PUT /orders/:id/cancel` - Cancel order

#### 📝 Categories

- `GET /categories` - Get all categories
- `POST /categories` - Create category (Admin)
- `PUT /categories/:id` - Update category (Admin)

#### ⭐ Reviews

- `POST /reviews` - Create review
- `GET /reviews/restaurant/:id` - Get restaurant reviews
- `PUT /reviews/:id` - Update review
- `POST /reviews/:id/response` - Add restaurant response

#### 🚚 Delivery Partners

- `POST /delivery-partners/apply` - Apply as delivery partner
- `GET /delivery-partners/available-orders` - Get available orders
- `POST /delivery-partners/accept-order/:id` - Accept delivery order
- `PUT /delivery-partners/availability` - Update availability status

## 🔒 Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting to prevent abuse
- Input validation and sanitization
- CORS configuration
- Security headers with Helmet
- Role-based access control

## 📊 Data Models

### User Schema

- Personal information and authentication
- Multiple addresses support
- Role-based permissions

### Restaurant Schema

- Complete business information
- Opening hours and delivery configuration
- Location-based services
- Performance metrics

### Order Schema

- Comprehensive order tracking
- Pricing breakdown
- Timeline management
- Payment integration ready

### Menu Item Schema

- Detailed item information
- Variants and add-ons support
- Nutritional information
- Customization options

## 🚀 Deployment

### Environment Variables

Set up the following environment variables:

- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret for JWT token signing
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (development/production)

### Production Build

```bash
npm run build
npm start
```

## 📈 Performance Considerations

- Database indexing for frequently queried fields
- Pagination for large data sets
- Rate limiting to prevent abuse
- Efficient MongoDB aggregation queries
- Caching strategies (Redis ready)

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run with coverage
npm run test:coverage
```

## 📦 Package Dependencies

### Core Dependencies

- **express** - Web framework
- **mongoose** - MongoDB object modeling
- **jsonwebtoken** - JWT authentication
- **bcryptjs** - Password hashing
- **express-validator** - Input validation
- **cors** - Cross-origin resource sharing
- **helmet** - Security headers
- **express-rate-limit** - Rate limiting
- **dotenv** - Environment variables

### Development Dependencies

- **nodemon** - Development server with auto-restart

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Author

**xpress-dev**

## 🆘 Support

For support, please open an issue in the repository or contact the development team.

---

**Note**: This API is designed to work with a React frontend application. Make sure to configure CORS settings appropriately for your frontend URL.
