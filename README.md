## E-Commerce Backend RESTful API
Welcome to my E-Commerce Backend RESTful API repository! This project serves as the backbone of a dynamic and feature-rich e-commerce web application, leveraging Node.js, Express, and MongoDB with Mongoose as the backend technology stack. Let's dive into the key features and functionalities that power this robust API:

## Key Features and Functionalities
* **Product Searching:** Users can perform product searching either by a search term or by category. In both cases users are able to filter by price and rating. And sort them ascending or descending on their price/rating/popularity (number of reviews)/creation date

* **User Authentication with JSON Web Token (JWT):** Ensuring secure access, the API integrates JSON Web Token authentication, allowing users to create accounts, log in, and perform actions such as changing their profile picture, username, email, saved phone number, add and delete favorited delivery addresses and safely change their password.

* **Address Management:** Users can store and delete delivery addresses, streamlining the ordering process by not requiring them to input their address each time. Additionally, they can edit the delivery address if the order is still pending.

* **User Management:** Administrators have the authority to manage users, granting them the capability delete users or users' reviews as needed.

* **Product and Category Management:** Administrators can perform comprehensive product and category management, adding, editing, or deleting products and categories. Products' ratings are calculated based on user reviews.

* **Review System:** Users can leave reviews for products and like/unlike other reviews. They can also edit or delete their own reviews.

* **Order Processing:** The API handles order management, enabling users to place orders, and administrators can manage orders, setting them to transit, paid, or delivered as needed.

* **Attribute-based Filtering:** Categories contain attributes, allowing users to filter products based on these attributes. When adding a new product, administrators can add new attributes and attribute values, which are automatically linked to the respective category.

## Technologies Used
* Node.js
* Express
* MongoDB with Mongoose
* JSON Web Token (JWT) for Authentication

Thank you for exploring this repository.

Should you have any inquiries or feedback, feel free to reach out.    
