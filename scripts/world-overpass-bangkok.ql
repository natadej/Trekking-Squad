[out:json][timeout:120];
(
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream)$"]["name"](13.70,100.485,13.76,100.55);
  nwr["shop"]["name"](13.70,100.485,13.76,100.55);
  way["building"]["name"](13.70,100.485,13.76,100.55);
  way["building"]["building:levels"](13.70,100.485,13.76,100.55);
  way["historic"]["name"](13.70,100.485,13.76,100.55);
  way["amenity"="place_of_worship"]["name"](13.70,100.485,13.76,100.55);
);
out center tags geom;
