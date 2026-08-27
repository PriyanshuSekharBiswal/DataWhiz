// Built-in Benchmark Test Dataset 1: Retail & E-Commerce Sales (with intentional dirty records)

export const SALES_CSV_RAW = `Date,ProductID,ProductName,Category,Region,Quantity,Price,Revenue,Discount,CustomerRating
2024-01-05,PRD-101,Aura Smartwatch Pro,Electronics,North,12,₹14999,179988,10%,4.7
2024-01-06,PRD-102,Echo Wireless Earbuds,Electronics,West,25,₹3499,87475,5%,4.2
06/01/2024,PRD-103,ErgoDesk Electric,Furniture,South,4,₹24999,99996,15%,4.8
2024-01-07,PRD-104,Lumina LED Lamp,Home & Living,East,18,₹1299,23382,0%,4.1
Jan 8, 2024,PRD-101,Aura Smartwatch Pro,Electronics,South,15,₹14999,224985,8%,4.6
2024-01-08,PRD-105,Apex Gaming Chair,furniture,North,6,₹18499,110994,12%,4.4
2024-01-09,PRD-102,Echo Wireless Earbuds,electronics,East,30,₹3499,104970,5%,4.3
2024-01-10,PRD-106,HydroFlow Water Bottle,Fitness,West,45,₹899,40455,0%,4.0
2024-01-11,PRD-107,Pulse Fitness Band,Fitness,North,22,₹2499,54978,10%,3.9
12/01/2024,PRD-103,ErgoDesk Electric,Furniture,East,5,₹24999,124995,15%,4.9
2024-01-13,PRD-104,Lumina LED Lamp,Home & Living,North,20,₹1299,25980,0%,4.2
2024-01-14,PRD-101,Aura Smartwatch Pro,Electronics,West,18,₹14999,269982,5%,4.7
2024-01-15,PRD-108,UltraClean Robotic Vacuum,Home & Living,South,8,₹29999,239992,20%,4.5
2024-01-16,PRD-105,Apex Gaming Chair,Furniture,West,7,₹18499,129493,10%,4.3
16/01/2024,PRD-105,Apex Gaming Chair,Furniture,West,7,₹18499,129493,10%,4.3
2024-01-17,PRD-102,Echo Wireless Earbuds,Electronics,North,28,₹3499,97972,0%,4.4
2024-01-18,PRD-106,HydroFlow Water Bottle,Fitness,South,50,₹899,44950,5%,4.1
2024-01-19,PRD-107,Pulse Fitness Band,fitness,East,19,₹2499,47481,10%,3.8
2024-01-20,PRD-101,Aura Smartwatch Pro,Electronics,East,14,₹14999,209986,5%,4.8
Jan 21, 2024,PRD-103,ErgoDesk Electric,Furniture,North,6,₹24999,149994,10%,4.7
2024-01-22,PRD-108,UltraClean Robotic Vacuum,Home & Living,West,10,₹29999,299990,15%,4.6
2024-01-23,PRD-104,Lumina LED Lamp,home & living,South,24,₹1299,31176,0%,4.3
2024-01-24,PRD-105,Apex Gaming Chair,Furniture,East,8,₹18499,147992,10%,4.5
2024-01-25,PRD-102,Echo Wireless Earbuds,Electronics,South,32,₹3499,111968,5%,4.2
2024-01-26,PRD-106,HydroFlow Water Bottle,Fitness,North,60,₹899,53940,10%,4.0
2024-01-27,PRD-107,Pulse Fitness Band,Fitness,West,25,₹2499,62475,5%,4.1
2024-01-28,PRD-101,Aura Smartwatch Pro,Electronics,North,20,₹14999,299980,10%,4.9
2024-01-29,PRD-103,ErgoDesk Electric,Furniture,West,7,₹24999,174993,12%,4.8
2024-01-30,PRD-108,UltraClean Robotic Vacuum,Home & Living,North,12,₹29999,359988,18%,4.7
2024-02-01,PRD-101,Aura Smartwatch Pro,Electronics,South,22,₹14999,329978,8%,4.8
2024-02-02,PRD-102,Echo Wireless Earbuds,Electronics,West,35,₹3499,122465,5%,4.5
2024-02-03,PRD-103,ErgoDesk Electric,Furniture,East,8,₹24999,199992,15%,4.9
2024-02-04,PRD-104,Lumina LED Lamp,Home & Living,North,28,₹1299,36372,0%,4.2
2024-02-05,PRD-105,Apex Gaming Chair,Furniture,South,9,₹18499,166491,10%,4.6
2024-02-06,PRD-106,HydroFlow Water Bottle,Fitness,East,65,₹899,58435,5%,4.3
2024-02-07,PRD-107,Pulse Fitness Band,Fitness,North,28,₹2499,69972,10%,4.0
2024-02-08,PRD-108,UltraClean Robotic Vacuum,Home & Living,East,15,₹29999,449985,15%,4.8
2024-02-09,PRD-101,Aura Smartwatch Pro,Electronics,West,26,₹14999,389974,5%,4.9
2024-02-10,PRD-102,Echo Wireless Earbuds,Electronics,East,40,₹3499,139960,8%,4.6
2024-02-11,PRD-103,ErgoDesk Electric,Furniture,North,10,₹24999,249990,10%,4.8
2024-02-12,PRD-104,Lumina LED Lamp,Home & Living,West,32,₹1299,41568,5%,4.4
2024-02-13,PRD-105,Apex Gaming Chair,Furniture,East,11,₹18499,203489,12%,4.7
2024-02-14,PRD-106,HydroFlow Water Bottle,Fitness,West,70,₹899,62930,10%,4.5
2024-02-15,PRD-107,Pulse Fitness Band,Fitness,South,32,₹2499,79968,8%,4.2
2024-02-16,PRD-108,UltraClean Robotic Vacuum,Home & Living,West,18,₹29999,539982,12%,4.9`;
