Technical Universtiy of Denmark 



<!-- Start of picture text -->
|<br><!-- End of picture text -->

# **Collision detection fun** 

Computer Graphics 

Felipe Bahamondes, s221516 Morten Tokkesdal, s225183 

November 21, 2026 

## **1 Introduction** 

When talking about the bouncing ball from Worksheet 12, we (Morten and Felipe) have discussed how collision detection is implemented. Therefore in this project, we will explore the concept and get a understanding for how it works. 

While researching we found that it used very broadly, and perhaps in some areas where you would not think about it. The book [1] mentions CAD/CAM, computer animation, physically based modeling, games, flight and vehicle simulators, robotics, path and motion planning, assembly, and virtual reality simulations. Given all these use cases, collision detection has been and still is a subject of extensive research. 

## **2 Objective** 

The objective of this project is to develop a collision detection pipeline capable of detecting collisions between rigid complex objects in large-scale scenes. Hereunder implement and describe the the different stages of collision detection, namely the broad, mid, and narrow phases, and understand different approaches to reducing the cost of detecting collisions. 

## **3 Work** 

The work done in this project is categorized into parts similar to the worksheet done during the course. Each part builds on the previous, and by the end we should have a complete collision detection pipeline. 

For the broad phase (first 4 parts) we used the book [1] as the main reference. 

For the rest, Gottchalks article on OBBTrees [2] is used as the main source. 

## **4 Parts** 

### **4.1 Part 1: Collision detection in 3 phases** 

Collision detection is all about knowing if objects collide with each other. In the following we will go over a naive approach. 

Say, we have _n_ Suzannes in a scene, each made up of _m_ primitives. The simplest approach to test for collisions is to probably to just compare every pair of objects and if their primitives collide.s 

In the worst case, this results in (︁ _n_ 2)︁ _· m_<sup>2</sup> tests per frame, which quickly become expensive for large scenes. 

To avoid this many tests collision detection is divided into three phases. Each phase narrows down the possible collisions using a different level of detail, allowing us to avoid unnecessary intersection tests. 

The first phase tests objects as a whole and is called the _broad phase_ . Its purpose is to identify pairs that might be colliding. For example, if two objects are far apart, there is no need to check their geometry in detail. Only candidate pairs are passed to the next phase. 

Next, the _midphase_ checks these candidate pairs in more detail. Instead of considering each object as a whole, it divides the geometry into smaller regions. If two regions are far apart, there is no need to test their primitives against each other. 

Page 1 of 10 

Finally, the _narrow phase_ tests the remaining primitives, as in the simple approach above. 

### **4.2 Part 2: Moving objects** 

Before anything can collide, we need moving objects. For this part, we set up a 2D plane and start with two moving quads. This gives us a simple scene, that we can build on top of later. 

#### **Result:** 

In Figure 1 below is the two moving quads. 

For the scene we used the same lighting as Worksheet 5 as well as having the same camera movement as Worksheet 10. This gives it a nice look as well as the functionality to move around and see if things actually collide or not. We also marked the plane with grids, so that it appears like a small 2D screen in 3D space. 



Figure 1: Two moving quads on 2D plane 

### **4.3 Part 3: BVs** 

Now let us do some collision detection; first step is the broad phase. 

Before looking into a specific broad phase algorithm, the common approach for all of them is to encapsulate the objects in a bounding volume (BV), and check if the BVs themselves collide. By doing this, we avoid doing a lot of comparison on detailed mesh. For two moving quads, this does not really matter as they are very simple, but we will do it anyway as we want to progress towards more complex objects. 

Common choices of BVs are axis-aligned bounding boxes (AABBs) and bounding spheres. A sphere can give tight fits for a roughly spherical objects and is convenient for rotations, as its radius does not change with orientation. An AABB, on the other hand, must be updated to remain axis-aligned when an object rotates. 

As we plan to support rotations and use the Suzanne and Teapot objects (relatively spherical objects) we decide to go with a bounding sphere. 

To find a bounding sphere for an object, we calculate the average position of its mesh vertices and choose the distance to the furthest vertex as the radius. This guarantees that the sphere encloses all the vertices and, consequently, its triangles. 

This approach is simple and cheap, but does not necessarily give the smallest enclosing sphere. Reason is that this calculated point minimizes the distances from the vertices, rather than the maximum distance to any vertex. 

Page 2 of 10 

#### **Result** 

To demonstrate the BVs, I added the option to render them objects (See figure 2). 



Figure 2: The two quads with their BVs 

### **4.4 Part 4: Broad phase - SAP** 

Now that the BVs are there, its time to implement a broad phase algorithm that can detect if they intersect. We decided to implement Sweep-and-Prune (SAP). 

The idea behind SAP is to project each bounding volume onto the world axes and compare the resulting one-dimensional intervals before using the following property: 

Two BVs overlap = _⇒_ Their projections over lap 

If the two BVs overlap, certainly their projections overlap. Note that its a implication, which means that it is possible to have overlapping projections, even though the BVs themselves do not. This can give false positives. 

In the following we will describe the algorithm on each axis. 

Let _si_ and _ei_ denote the start and end of object _i_ ’s projected interval on one axis. We place all endpoints in a list, _sort_ them, and sweep from left to right: 

- When we encounter a start point _si_ , we add the object to the active list. 

- When we encounter an end point _ei_ , we remove the object from the active list. 

When an _si_ is added to the active list and there already is some endpoints in there, that means that object _i_ overlaps with the objects corresponding to those endpoints. Report those overlapping intervals. 

For a fixed number of axes, sorting takes _O_ ( _n_ log _n_ ), sweeping the endpoints takes _O_ ( _n_ ), and reporting the _k_ overlapping interval pairs takes _O_ ( _k_ ). The resulting cost is _O_ ( _n_ log _n_ + _k_ ). 

The book describes, that if we assume temporal coherence, then we can get a better running time. The idea is that SAP above runs for every frame, but moving objects usually do not change positions that much between frames. Consequently, their projected endpoints do not change much. By saving the previous frames’ endpoint order and updating the endpoint values, 

Page 3 of 10 

we can use insertion sort on these nearly sorted list of endpoints, which works in _O_ ( _n_ + _k_ ) on nearly sorted lists. 

#### **Result** 

To test the SAP implementation, we would color the quads red if a potential collision pair was found. 

Figure 3 below shows the result. The upper part shows that two intersecting BVs accurately colors the quads. The lower part shows that SAP sometimes give false positives; The quads are highlighted even though their bounding spheres do not intersect. 





Figure 3: SAP in action 

Page 4 of 10 

### **4.5 Part 5: Midphase Collision Detection** 

After the broad phase, we have a list of object pairs, that we need to investigate further. 

Similar to the broad phase, we again make use of BVs to reduce work. The idea is to enclose groups of primitives in each object, such that we can quickly test the BVs instead of the primitives. We create what is called a BV-hierarchy (BVH), and there many different once. In this part we will implementing a specific one; OBBTrees. 

Before looking at OBBTrees, we want to get something out of the way; why even bother with a a mid phase when we just have two quads at the moment? The answer is that you should not bother at all - it is faster to just test the triangles of the quads directly. However, since the objective is make this pipeline work for complex objects, a midphase is implemented. 

### **4.6 OBBTrees** 

An OBBTree is BVH that uses oriented bounding boxes (OBBs) as BV. An OBB is a rectangular bounding box that can have any orientation. Unlike an AABB, it is not restricted to the world axes. This usually give a tight fit around geometry that is rotated or stretched out in a particular direction. 

To build an OBBTree, we need to solve two problems: 

1. How do we fit an OBB around a group of points? 

2. How should we organize the OBBs into a hierarchy? 

#### **4.6.1 1) Fitting an OBB around a group of points** 

To fit an OBB around a mesh, we need to determine its position, orientation, and dimensions. 

To determine the orientation, we first calculate the mean position of the points and their covariance matrix. We then find the eigenvectors of the covariance matrix, and use those as basis vectors for the OBB. By aligning the box using this basis, we get an orientation that fits the distribution of points closely, resulting in a tighter bounding volume. 

Next, we project every point onto each axis and find the minimum and maximum projection. The difference between these values gives the box’s dimension along that axis. The midpoints of the three intervals determine the box’s center, which is transformed back into the original coordinate system. 

The resulting box encloses all the points. For a triangle mesh, enclosing all the triangle vertices also encloses the triangles themselves. The principal directions provide a useful orientation, although they do not necessarily produce the smallest possible OBB. 

#### **4.6.2 2) Organizing the OBBTree** 

Now that we can fit an OBB around a group of triangles, we need to organize the boxes into a hierarchy. 

We use a top-down approach. First, we create one OBB around the whole model. We then divide its triangles into two groups and create a separate OBB around each group. This process is repeated recursively until a group contains one triangle or cannot be divided. 

- More precisely, the subdivision works as follows: 

   1. Find the longest axis of the current OBB. 

   2. Project the triangle centers onto that axis and sort them by projection. 

Page 5 of 10 

3. Split the sorted list at the median, producing two groups with almost the same size. 

4. Create a new OBB around each group and repeat the process. 

If the split does not produce two non-empty groups, we try the second-longest axis and then the shortest axis. If all three fail, the group becomes a leaf node, even if it contains more than one triangle. 

The Figure below illustrates the subdivision in 2D: 

> Figure SS 4: Illustration of OBBTree w@P subdivision. 

Figure 4: Illustration of OBBTree subdivision. 

In the tree, each child OBB is stored with a transformation matrix describing its position and orientation relative to its parent. This very useful as objects move, as we do not need to rebuild its OBBTree, but instead apply the objects model matrix to the parents, and then all the child OBBs follows from that. This also means, that just store a single OBBTree for each different model. 

### **4.7 Testing two objects** 

Using two the OBBTree of two objects, we can test whether two objects collide or not. 

Assume two objects A and B where each has its own OBBTree. We start by checking if the root OBB intersects. If they do not, discard the pair as there is no chance that the objects themselves collide. If they do, we test combinations of their children. Any non-overlapping OBB pair is discarded along with its descendants; overlapping pairs are explored further. 

If one node is already a leaf, we compare it with the other node’s children. When both nodes are leaves, their triangles are passed to the narrow phase, and it is checked whether they actually collide. If a collision is found, then the search stops. 

#### **4.7.1 Running time** 

Let _n_ denote the total numbers of triangles in objects A. As we use median splitting, its OBBTree is balanced and has depth _O_ (log _n_ ). 

In the best case, the root OBBs do not overlap with object B. The pair is discarded after one OBB test, giving a running time of _O_ (1). 

In the worst case, OBB tests do not prune the search, so the algorithm tests every pair of internal node and every pair of leaf triangles. If both objects have about _n_ triangles, the worstcase running time is _O_ ( _n_<sup>2</sup> ). 

### **4.8 Checking OBB overlap** 

The testing above required that you determine if two OBBs overlap. Here we describe how that was done. 

We express both A and B in the same coordinate system - for example the local coordinate system of A, where A is axis-aligned and centered at the origin. Then, we use the Separating 

Page 6 of 10 

Axis Theorem (SAT). A separating axis is a direction along which their projections do not overlap. If such an axis exists, the objects are separated. Like SAP, this involves comparing projected intervals, but SAT tests axes for the geometry rather than only the world axes. 

In 3D you test up to 15 candidate axes: 

- The three face-normal axes of box A. 

- The three face-normal axes of box B. 

- The nine axes obtained from cross products of pairs of box-edge directions. 

For each candidate axis, project both OBBs onto it. If their intervals do not overlap on any one axis, the boxes are separated. If no separating axis is found, the boxes are considered to overlap. 

#### **4.8.1 Result** 

To visualize OBBs, we implemented the functionality to render them at different depths. The Figure below shows level 0, 1, and 13. 







Figure 5: Visualization of the OBBTree at levels 0, 1 and 13 

Level 13 simply all the leafs. Here you can clearly see how the OBBs nicely lays around a single triangle. 

## **5 Part 6: Narrow phase** 

The midphase leaves us with pairs of leaf nodes whose bounding boxes overlap. The narrow phase checks the triangles in those leaves. For this, we use SAT again, this time on triangles rather than OBBs. 

The triangles are transformed into world space before testing. Their projections are compared along candidate separating axes derived from their face normals and edges. The implementation also tests axes in the plane of the triangles, which are important when the triangles are coplanar. If a separating axis is found, the triangles do not intersect. Otherwise, they are treated as intersecting. 

#### **5.0.1 Result** 

To test the narrow phase and midphase, we placed a rotating teapot inside the handle of a larger teapot. When the tip touches the larger teapot both turns red, correctly indicating that they touch. 

Page 7 of 10 





Figure 6: Just when the tip of the teapot touches the other, it turns red. 

### **5.1 Part 7: Performance and changes** 

#### **5.1.1 Performance** 

To have some evaluation the implementation, we added controls for spawning multiple objects and an FPS display. Objects are placed at random positions and assigned random linear and angular velocities. We then spawned in a lot of objects of varying complexity, and saw when the FPS would drop down 30 FPS. 

The results are: 

|**Model**|**Number of objects**<br>**Triangles **|**per **|**object**|
|---|---|---|---|
|Quads|_≈_300||2|
|Circles|_≈_200||48|
|Suzanne|_≈_100||968|
|Teapot|_≈_60||6320|



Table 1: Number of objects for complexities. 

Complexity trivially add more computation, as we need to traverse the OBBTrees.This is why the scene can only handle 60 Teapots and a lot of quads. 

Several factors influence the performance such as object count, complexity, size, velocity, distribution and geometry. 

The Figure below shows the setup: 

7. 

Page 8 of 10 



Figure 7: All the objects jumping around 

#### **5.1.2 Changes** 

One possible change is to use collision meshes for Suzanne and Teapot. These meshes would contain fewer triangles, resulting in smaller OBBTrees and fewer potential OBB tests. The trade-off is lower accuracy, since the simplified meshes are ... simplified. 

Another plausible change is to set a cooldown on checking pairs that have just been checked. In our setup pairs that move across each other triggers full pipelines on every frame for those objects. This approach will miss collisions, so it might not be suitable if the application needs high accuracy. 

Finally, a collision response could be implemented to prevent objects from passing through one another. This would keep objects from accumulating in overlapping configurations, and therefore to trigger the expensive midphase on every frame. 

### **5.2 Conclusion** 

In this project, we developed a collision detection pipeline using SAP, OBBTrees, and SAT. The implementation demonstrated how the broad, mid, and narrow phases reduce unnecessary intersection tests. Performance testing showed that both the number of objects and their geometric complexity affect performance. Further improvements could include simplified collision meshes, reduced repeated checks, and collision response. Overall, the project provided practical insight into efficient collision detection for complex moving objects. 

Page 9 of 10 

## **Contributions** 

|**Task**|**Name**|
|---|---|
|Introduction|Felipe|
|Objective|Morten|
|Work|Felipe|
|Part 1:|Morten|
|Part 2|Felipe|
|Part 4|Morten|
|Part 5|Felipe|
|Part 6|Morten|
|Part 7|Feipe|
|Conclusion|Morten|



Table 2: Individual contributions to the report and code. 

## **References** 

- [1] Tomas Akenine-M¨oller et al. “Real-Time Rendering Fourth Edition”. In: (2018). url: `http: //realtimerendering.com` . 

- [2] S Gottschalk, M C Lin, and D Manocha. “OBBTree: A Hierarchical Structure for Rapid Interference Detection”. In: (). url: `http://www.cs.unc.edu/~geom/OBB/OBBT.html` . 

Page 10 of 10 

