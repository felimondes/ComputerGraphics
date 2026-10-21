// var list = [[1,1,1,1], [2,2,2,2]]
// var list1 = [[3,3], [4,4]]


// let result = list.flatMap((j, i) => [...j, ...list1[i]]); 
// console.log(result)



var list = [1,1,1,1, 2,2,2,2]
var list1 = [3,3, 4,4]


let result = list.map((j, i) => [...j, ...list1[i]]); 
console.log(result)