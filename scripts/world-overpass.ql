[out:json][timeout:90];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|bar|food_court|ice_cream)$"](36.079,-115.19,36.151,-115.142);
  nwr["shop"](36.079,-115.19,36.151,-115.142);
  way["tourism"="hotel"](36.079,-115.19,36.151,-115.142);
  way["building"]["name"](36.079,-115.19,36.151,-115.142);
  way["leisure"="resort"](36.079,-115.19,36.151,-115.142);
);
out center tags geom;
