// Built-in Benchmark Test Dataset 3: Multi-Table Relational E-Commerce

export const MULTI_TABLE_RELATIONAL = {
  Customers: `CustomerID,CustomerName,Segment,City,State,JoinDate
C101,Aarav Sharma,Consumer,Mumbai,Maharashtra,2023-01-15
C102,Diya Patel,Corporate,Ahmedabad,Gujarat,2023-03-22
C103,Rohan Verma,Small Business,Bengaluru,Karnataka,2023-05-10
C104,Ananya Iyer,Consumer,Chennai,Tamil Nadu,2023-06-18
C105,Vikram Malhotra,Corporate,Delhi,Delhi,2023-08-01
C106,Sneha Roy,Consumer,Kolkata,West Bengal,2023-09-14
C107,Kabir Sen,Small Business,Hyderabad,Telangana,2023-11-05
C108,Pooja Hegde,Consumer,Pune,Maharashtra,2024-01-12`,

  Orders: `OrderID,CustomerID,ProductID,OrderDate,Quantity,PaymentStatus,ShippingRegion
ORD-901,C101,P501,2024-01-10,2,Completed,West
ORD-902,C102,P502,2024-01-12,5,Completed,West
ORD-903,C103,P503,2024-01-15,1,Completed,South
ORD-904,C104,P501,2024-01-18,3,Completed,South
ORD-905,C105,P504,2024-01-20,10,Completed,North
ORD-906,C106,P502,2024-01-25,4,Completed,East
ORD-907,C107,P505,2024-01-28,2,Pending,South
ORD-908,C108,P501,2024-02-02,1,Completed,West
ORD-909,C101,P504,2024-02-05,6,Completed,West
ORD-910,C103,P502,2024-02-08,8,Completed,South`,

  Products: `ProductID,ProductName,Category,CostPrice,UnitPrice,StockLevel
P501,Ergo Lumbar Cushion,Office Ergonomics,850,1999,140
P502,4K USB-C Conference Webcam,Electronics,2800,6499,65
P503,Standing Desk Dual Motor,Furniture,12000,28999,22
P504,Active Noise Cancel Headset,Electronics,1900,4999,90
P505,Mechanical RGB Keyboard,Gaming,1400,3499,110`
};
