export type City = { name: string; lat: number; lng: number };
export type StateData = Record<string, City[]>;
export type CountryData = Record<string, StateData>;

export const LOCATION_DATA: CountryData = {
    "United States": {
        "Alabama": [
            { name: "Huntsville", lat: 34.7304, lng: -86.5861 }, { name: "Birmingham", lat: 33.5186, lng: -86.8104 },
            { name: "Montgomery", lat: 32.3668, lng: -86.3000 }, { name: "Mobile", lat: 30.6954, lng: -88.0399 },
            { name: "Tuscaloosa", lat: 33.2098, lng: -87.5692 }, { name: "Hoover", lat: 33.4054, lng: -86.8045 },
            { name: "Dothan", lat: 31.2232, lng: -85.3905 }, { name: "Auburn", lat: 32.6099, lng: -85.4808 },
            { name: "Decatur", lat: 34.6059, lng: -86.9833 }, { name: "Madison", lat: 34.6993, lng: -86.7483 }
        ],
        "Alaska": [
            { name: "Anchorage", lat: 61.2181, lng: -149.9003 }, { name: "Fairbanks", lat: 64.8378, lng: -147.7164 },
            { name: "Juneau", lat: 58.3019, lng: -134.4197 }, { name: "Knik-Fairview", lat: 61.5033, lng: -149.6006 },
            { name: "Badger", lat: 64.7958, lng: -147.3686 }, { name: "College", lat: 64.8483, lng: -147.8222 },
            { name: "Sitka", lat: 57.0531, lng: -135.3300 }, { name: "Ketchikan", lat: 55.3422, lng: -131.6461 },
            { name: "Wasilla", lat: 61.5809, lng: -149.4411 }, { name: "Kenai", lat: 60.5544, lng: -151.2583 }
        ],
        "Arizona": [
            { name: "Phoenix", lat: 33.4484, lng: -112.0740 }, { name: "Tucson", lat: 32.2226, lng: -110.9747 },
            { name: "Mesa", lat: 33.4152, lng: -111.8315 }, { name: "Chandler", lat: 33.3062, lng: -111.8413 },
            { name: "Gilbert", lat: 33.3528, lng: -111.7890 }, { name: "Glendale", lat: 33.5387, lng: -112.1860 },
            { name: "Scottsdale", lat: 33.4942, lng: -111.9261 }, { name: "Peoria", lat: 33.5806, lng: -112.2374 },
            { name: "Tempe", lat: 33.4255, lng: -111.9400 }, { name: "Surprise", lat: 33.6292, lng: -112.3679 }
        ],
        "Arkansas": [
            { name: "Little Rock", lat: 34.7465, lng: -92.2896 }, { name: "Fayetteville", lat: 36.0822, lng: -94.1719 },
            { name: "Fort Smith", lat: 35.3859, lng: -94.3985 }, { name: "Springdale", lat: 36.1867, lng: -94.1288 },
            { name: "Jonesboro", lat: 35.8423, lng: -90.7043 }, { name: "Rogers", lat: 36.3320, lng: -94.1185 },
            { name: "North Little Rock", lat: 34.7695, lng: -92.2615 }, { name: "Conway", lat: 35.0887, lng: -92.4421 },
            { name: "Bentonville", lat: 36.3729, lng: -94.2088 }, { name: "Pine Bluff", lat: 34.2284, lng: -92.0032 }
        ],
        "California": [
            { name: "Los Angeles", lat: 34.0522, lng: -118.2437 }, { name: "San Diego", lat: 32.7157, lng: -117.1611 },
            { name: "San Jose", lat: 37.3382, lng: -121.8863 }, { name: "San Francisco", lat: 37.7749, lng: -122.4194 },
            { name: "Fresno", lat: 36.7378, lng: -119.7871 }, { name: "Sacramento", lat: 38.5816, lng: -121.4944 },
            { name: "Long Beach", lat: 33.7701, lng: -118.1937 }, { name: "Oakland", lat: 37.8044, lng: -122.2712 },
            { name: "Bakersfield", lat: 35.3733, lng: -119.0187 }, { name: "Anaheim", lat: 33.8366, lng: -117.9143 }
        ],
        "Colorado": [
            { name: "Denver", lat: 39.7392, lng: -104.9903 }, { name: "Colorado Springs", lat: 38.8339, lng: -104.8214 },
            { name: "Aurora", lat: 39.7294, lng: -104.8319 }, { name: "Fort Collins", lat: 40.5853, lng: -105.0844 },
            { name: "Lakewood", lat: 39.7047, lng: -105.0814 }, { name: "Thornton", lat: 39.8680, lng: -104.9719 },
            { name: "Arvada", lat: 39.8028, lng: -105.0875 }, { name: "Westminster", lat: 39.8367, lng: -105.0372 },
            { name: "Pueblo", lat: 38.2544, lng: -104.6091 }, { name: "Greeley", lat: 40.4233, lng: -104.7091 }
        ],
        "Connecticut": [
            { name: "Bridgeport", lat: 41.1792, lng: -73.1894 }, { name: "New Haven", lat: 41.3083, lng: -72.9279 },
            { name: "Stamford", lat: 41.0534, lng: -73.5387 }, { name: "Hartford", lat: 41.7658, lng: -72.6734 },
            { name: "Waterbury", lat: 41.5582, lng: -73.0515 }, { name: "Norwalk", lat: 41.1177, lng: -73.4082 },
            { name: "Danbury", lat: 41.3948, lng: -73.4540 }, { name: "New Britain", lat: 41.6612, lng: -72.7795 },
            { name: "West Hartford", lat: 41.7621, lng: -72.7420 }, { name: "Greenwich", lat: 41.0262, lng: -73.6282 }
        ],
        "Delaware": [
            { name: "Wilmington", lat: 39.7391, lng: -75.5398 }, { name: "Dover", lat: 39.1582, lng: -75.5244 },
            { name: "Newark", lat: 39.6837, lng: -75.7497 }, { name: "Middletown", lat: 39.4496, lng: -75.7163 },
            { name: "Smyrna", lat: 39.2998, lng: -75.6055 }, { name: "Milford", lat: 38.9132, lng: -75.4285 },
            { name: "Seaford", lat: 38.6418, lng: -75.6105 }, { name: "Georgetown", lat: 38.6901, lng: -75.3860 },
            { name: "Elsmere", lat: 39.7384, lng: -75.5977 }, { name: "New Castle", lat: 39.6612, lng: -75.5630 }
        ],
        "Florida": [
            { name: "Jacksonville", lat: 30.3322, lng: -81.6557 }, { name: "Miami", lat: 25.7617, lng: -80.1918 },
            { name: "Tampa", lat: 27.9506, lng: -82.4572 }, { name: "Orlando", lat: 28.5383, lng: -81.3792 },
            { name: "St. Petersburg", lat: 27.7676, lng: -82.6403 }, { name: "Hialeah", lat: 25.8576, lng: -80.2781 },
            { name: "Port St. Lucie", lat: 27.2730, lng: -80.3582 }, { name: "Cape Coral", lat: 26.5629, lng: -81.9495 },
            { name: "Tallahassee", lat: 30.4383, lng: -84.2807 }, { name: "Fort Lauderdale", lat: 26.1224, lng: -80.1373 }
        ],
        "Georgia": [
            { name: "Atlanta", lat: 33.7490, lng: -84.3880 }, { name: "Augusta", lat: 33.4705, lng: -81.9748 },
            { name: "Columbus", lat: 32.4610, lng: -84.9877 }, { name: "Macon", lat: 32.8407, lng: -83.6324 },
            { name: "Savannah", lat: 32.0809, lng: -81.0912 }, { name: "Athens", lat: 33.9519, lng: -83.3576 },
            { name: "Sandy Springs", lat: 33.9304, lng: -84.3733 }, { name: "South Fulton", lat: 33.5852, lng: -84.6212 },
            { name: "Roswell", lat: 34.0232, lng: -84.3616 }, { name: "Johns Creek", lat: 34.0289, lng: -84.1986 }
        ],
        "Hawaii": [
            { name: "Honolulu", lat: 21.3069, lng: -157.8583 }, { name: "East Honolulu", lat: 21.2855, lng: -157.7285 },
            { name: "Pearl City", lat: 21.3972, lng: -157.9733 }, { name: "Hilo", lat: 19.7241, lng: -155.0868 },
            { name: "Kailua", lat: 21.4022, lng: -157.7394 }, { name: "Waipahu", lat: 21.3867, lng: -158.0092 },
            { name: "Kaneohe", lat: 21.4181, lng: -157.8036 }, { name: "Mililani", lat: 21.4502, lng: -158.0163 },
            { name: "Kahului", lat: 20.8986, lng: -156.4618 }, { name: "Ewa Gentry", lat: 21.3364, lng: -158.0265 }
        ],
        "Idaho": [
            { name: "Boise", lat: 43.6150, lng: -116.2023 }, { name: "Meridian", lat: 43.6121, lng: -116.3915 },
            { name: "Nampa", lat: 43.5841, lng: -116.5612 }, { name: "Idaho Falls", lat: 43.4917, lng: -112.0340 },
            { name: "Caldwell", lat: 43.6629, lng: -116.6874 }, { name: "Pocatello", lat: 42.8713, lng: -112.4455 },
            { name: "Coeur d'Alene", lat: 47.6777, lng: -116.7803 }, { name: "Twin Falls", lat: 42.5628, lng: -114.4608 },
            { name: "Post Falls", lat: 47.7121, lng: -116.9474 }, { name: "Rexburg", lat: 43.8260, lng: -111.7897 }
        ],
        "Illinois": [
            { name: "Chicago", lat: 41.8781, lng: -87.6298 }, { name: "Aurora", lat: 41.7606, lng: -88.3201 },
            { name: "Naperville", lat: 41.7508, lng: -88.1535 }, { name: "Joliet", lat: 41.5250, lng: -88.0817 },
            { name: "Rockford", lat: 42.2711, lng: -89.0940 }, { name: "Springfield", lat: 39.7817, lng: -89.6501 },
            { name: "Elgin", lat: 42.0354, lng: -88.2826 }, { name: "Peoria", lat: 40.6936, lng: -89.5890 },
            { name: "Champaign", lat: 40.1164, lng: -88.2434 }, { name: "Waukegan", lat: 42.3636, lng: -87.8448 }
        ],
        "Indiana": [
            { name: "Indianapolis", lat: 39.7684, lng: -86.1581 }, { name: "Fort Wayne", lat: 41.0793, lng: -85.1394 },
            { name: "Evansville", lat: 37.9716, lng: -87.5711 }, { name: "South Bend", lat: 41.6764, lng: -86.2520 },
            { name: "Carmel", lat: 39.9784, lng: -86.1180 }, { name: "Fishers", lat: 39.9556, lng: -86.0139 },
            { name: "Bloomington", lat: 39.1653, lng: -86.5264 }, { name: "Hammond", lat: 41.5834, lng: -87.5000 },
            { name: "Gary", lat: 41.5934, lng: -87.3464 }, { name: "Lafayette", lat: 40.4167, lng: -86.8753 }
        ],
        "Iowa": [
            { name: "Des Moines", lat: 41.5868, lng: -93.6250 }, { name: "Cedar Rapids", lat: 41.9779, lng: -91.6656 },
            { name: "Davenport", lat: 41.5236, lng: -90.5776 }, { name: "Sioux City", lat: 42.4967, lng: -96.4059 },
            { name: "Iowa City", lat: 41.6611, lng: -91.5302 }, { name: "Waterloo", lat: 42.4928, lng: -92.3426 },
            { name: "Ames", lat: 42.0308, lng: -93.6319 }, { name: "West Des Moines", lat: 41.5772, lng: -93.7113 },
            { name: "Council Bluffs", lat: 41.2619, lng: -95.8608 }, { name: "Ankeny", lat: 41.7297, lng: -93.6005 }
        ],
        "Kansas": [
            { name: "Wichita", lat: 37.6872, lng: -97.3301 }, { name: "Overland Park", lat: 38.9822, lng: -94.6708 },
            { name: "Kansas City", lat: 39.1155, lng: -94.6268 }, { name: "Olathe", lat: 38.8814, lng: -94.8191 },
            { name: "Topeka", lat: 39.0473, lng: -95.6752 }, { name: "Lawrence", lat: 38.9717, lng: -95.2353 },
            { name: "Shawnee", lat: 39.0142, lng: -94.7501 }, { name: "Manhattan", lat: 39.1836, lng: -96.5717 },
            { name: "Lenexa", lat: 38.9697, lng: -94.7674 }, { name: "Salina", lat: 38.8403, lng: -97.6114 }
        ],
        "Kentucky": [
            { name: "Louisville", lat: 38.2527, lng: -85.7585 }, { name: "Lexington", lat: 38.0406, lng: -84.5037 },
            { name: "Bowling Green", lat: 36.9825, lng: -86.4444 }, { name: "Owensboro", lat: 37.7719, lng: -87.1112 },
            { name: "Covington", lat: 39.0837, lng: -84.5086 }, { name: "Richmond", lat: 37.7479, lng: -84.2947 },
            { name: "Georgetown", lat: 38.2098, lng: -84.5588 }, { name: "Florence", lat: 38.9989, lng: -84.6266 },
            { name: "Nicholasville", lat: 37.8806, lng: -84.5730 }, { name: "Hopkinsville", lat: 36.8656, lng: -87.4886 }
        ],
        "Louisiana": [
            { name: "New Orleans", lat: 29.9511, lng: -90.0715 }, { name: "Baton Rouge", lat: 30.4515, lng: -91.1871 },
            { name: "Shreveport", lat: 32.5252, lng: -93.7502 }, { name: "Lafayette", lat: 30.2241, lng: -92.0198 },
            { name: "Lake Charles", lat: 30.2266, lng: -93.2174 }, { name: "Bossier City", lat: 32.5160, lng: -93.7321 },
            { name: "Kenner", lat: 30.0330, lng: -90.2590 }, { name: "Monroe", lat: 32.5093, lng: -92.1193 },
            { name: "Alexandria", lat: 31.3113, lng: -92.4451 }, { name: "Houma", lat: 29.5958, lng: -90.7195 }
        ],
        "Maine": [
            { name: "Portland", lat: 43.6591, lng: -70.2568 }, { name: "Lewiston", lat: 44.1004, lng: -70.2148 },
            { name: "Bangor", lat: 44.8016, lng: -68.7712 }, { name: "South Portland", lat: 43.6382, lng: -70.2551 },
            { name: "Auburn", lat: 44.0973, lng: -70.2312 }, { name: "Biddeford", lat: 43.4926, lng: -70.4534 },
            { name: "Sanford", lat: 43.4392, lng: -70.7744 }, { name: "Saco", lat: 43.5009, lng: -70.4439 },
            { name: "Augusta", lat: 44.3106, lng: -69.7795 }, { name: "Westbrook", lat: 43.6765, lng: -70.3712 }
        ],
        "Maryland": [
            { name: "Baltimore", lat: 39.2904, lng: -76.6122 }, { name: "Frederick", lat: 39.4143, lng: -77.4105 },
            { name: "Rockville", lat: 39.0840, lng: -77.1528 }, { name: "Gaithersburg", lat: 39.1434, lng: -77.2014 },
            { name: "Bowie", lat: 39.0068, lng: -76.7791 }, { name: "Hagerstown", lat: 39.6418, lng: -77.7200 },
            { name: "Annapolis", lat: 38.9784, lng: -76.4922 }, { name: "College Park", lat: 38.9897, lng: -76.9378 },
            { name: "Salisbury", lat: 38.3607, lng: -75.5994 }, { name: "Laurel", lat: 39.0993, lng: -76.8483 }
        ],
        "Massachusetts": [
            { name: "Boston", lat: 42.3601, lng: -71.0589 }, { name: "Worcester", lat: 42.2626, lng: -71.8023 },
            { name: "Springfield", lat: 42.1015, lng: -72.5898 }, { name: "Cambridge", lat: 42.3736, lng: -71.1097 },
            { name: "Lowell", lat: 42.6334, lng: -71.3162 }, { name: "Brockton", lat: 42.0834, lng: -71.0184 },
            { name: "New Bedford", lat: 41.6362, lng: -70.9342 }, { name: "Quincy", lat: 42.2529, lng: -71.0023 },
            { name: "Lynn", lat: 42.4668, lng: -70.9495 }, { name: "Fall River", lat: 41.7015, lng: -71.1550 }
        ],
        "Michigan": [
            { name: "Detroit", lat: 42.3314, lng: -83.0458 }, { name: "Grand Rapids", lat: 42.9634, lng: -85.6681 },
            { name: "Warren", lat: 42.4919, lng: -83.0238 }, { name: "Sterling Heights", lat: 42.5803, lng: -83.0302 },
            { name: "Ann Arbor", lat: 42.2808, lng: -83.7430 }, { name: "Lansing", lat: 42.7325, lng: -84.5555 },
            { name: "Dearborn", lat: 42.3223, lng: -83.1763 }, { name: "Clinton Township", lat: 42.5873, lng: -82.9199 },
            { name: "Canton", lat: 42.3086, lng: -83.4821 }, { name: "Livonia", lat: 42.3950, lng: -83.3742 }
        ],
        "Minnesota": [
            { name: "Minneapolis", lat: 44.9778, lng: -93.2650 }, { name: "St. Paul", lat: 44.9537, lng: -93.0900 },
            { name: "Rochester", lat: 44.0121, lng: -92.4802 }, { name: "Duluth", lat: 46.7867, lng: -92.1005 },
            { name: "Bloomington", lat: 44.8408, lng: -93.2983 }, { name: "Brooklyn Park", lat: 45.0941, lng: -93.3563 },
            { name: "Plymouth", lat: 45.0166, lng: -93.4527 }, { name: "Woodbury", lat: 44.9239, lng: -92.4646 },
            { name: "Maple Grove", lat: 45.0725, lng: -93.4558 }, { name: "St. Cloud", lat: 45.5579, lng: -94.1632 }
        ],
        "Mississippi": [
            { name: "Jackson", lat: 32.2988, lng: -90.1848 }, { name: "Gulfport", lat: 30.3674, lng: -89.0928 },
            { name: "Southaven", lat: 34.9919, lng: -90.0023 }, { name: "Biloxi", lat: 30.3960, lng: -88.8853 },
            { name: "Hattiesburg", lat: 31.3271, lng: -89.2903 }, { name: "Olive Branch", lat: 34.9618, lng: -89.8295 },
            { name: "Tupelo", lat: 34.2576, lng: -88.7034 }, { name: "Meridian", lat: 32.3643, lng: -88.7037 },
            { name: "Greenville", lat: 33.4101, lng: -91.0601 }, { name: "Clinton", lat: 32.3415, lng: -90.3218 }
        ],
        "Missouri": [
            { name: "Kansas City", lat: 39.0997, lng: -94.5786 }, { name: "St. Louis", lat: 38.6270, lng: -90.1994 },
            { name: "Springfield", lat: 37.2090, lng: -93.2923 }, { name: "Columbia", lat: 38.9517, lng: -92.3341 },
            { name: "Independence", lat: 39.0911, lng: -94.4155 }, { name: "Lee's Summit", lat: 38.9108, lng: -94.3822 },
            { name: "O'Fallon", lat: 38.8106, lng: -90.6998 }, { name: "St. Joseph", lat: 39.7674, lng: -94.8466 },
            { name: "St. Charles", lat: 38.7839, lng: -90.4623 }, { name: "St. Peters", lat: 38.7884, lng: -90.6307 }
        ],
        "Montana": [
            { name: "Billings", lat: 45.7833, lng: -108.5007 }, { name: "Missoula", lat: 46.8721, lng: -113.9940 },
            { name: "Great Falls", lat: 47.5053, lng: -111.3008 }, { name: "Bozeman", lat: 45.6770, lng: -111.0429 },
            { name: "Butte", lat: 46.0038, lng: -112.5348 }, { name: "Helena", lat: 46.5891, lng: -112.0391 },
            { name: "Kalispell", lat: 48.1926, lng: -114.3161 }, { name: "Havre", lat: 48.5500, lng: -109.6841 },
            { name: "Anaconda", lat: 46.1285, lng: -112.9423 }, { name: "Miles City", lat: 46.4083, lng: -105.8406 }
        ],
        "Nebraska": [
            { name: "Omaha", lat: 41.2565, lng: -95.9345 }, { name: "Lincoln", lat: 40.8136, lng: -96.7026 },
            { name: "Bellevue", lat: 41.1594, lng: -95.9189 }, { name: "Grand Island", lat: 40.9264, lng: -98.3420 },
            { name: "Kearney", lat: 40.6995, lng: -99.0815 }, { name: "Fremont", lat: 41.4333, lng: -96.4981 },
            { name: "Hastings", lat: 40.5858, lng: -98.3895 }, { name: "Norfolk", lat: 42.0325, lng: -97.4137 },
            { name: "North Platte", lat: 41.1403, lng: -100.7601 }, { name: "Columbus", lat: 41.4297, lng: -97.3686 }
        ],
        "Nevada": [
            { name: "Las Vegas", lat: 36.1699, lng: -115.1398 }, { name: "Henderson", lat: 36.0395, lng: -114.9817 },
            { name: "Reno", lat: 39.5296, lng: -119.8138 }, { name: "North Las Vegas", lat: 36.1989, lng: -115.1175 },
            { name: "Sparks", lat: 39.5349, lng: -119.7527 }, { name: "Carson City", lat: 39.1638, lng: -119.7674 },
            { name: "Fernley", lat: 39.6080, lng: -119.2518 }, { name: "Elko", lat: 40.8324, lng: -115.7631 },
            { name: "Mesquite", lat: 36.8055, lng: -114.0672 }, { name: "Boulder City", lat: 35.9786, lng: -114.8325 }
        ],
        "New Hampshire": [
            { name: "Manchester", lat: 42.9956, lng: -71.4548 }, { name: "Nashua", lat: 42.7654, lng: -71.4676 },
            { name: "Concord", lat: 43.2081, lng: -71.5376 }, { name: "Dover", lat: 43.1979, lng: -70.8737 },
            { name: "Rochester", lat: 43.3045, lng: -70.9756 }, { name: "Keene", lat: 42.9337, lng: -72.2781 },
            { name: "Portsmouth", lat: 43.0718, lng: -70.7626 }, { name: "Laconia", lat: 43.5279, lng: -71.4704 },
            { name: "Claremont", lat: 43.3767, lng: -72.3473 }, { name: "Lebanon", lat: 43.6420, lng: -72.2518 }
        ],
        "New Jersey": [
            { name: "Newark", lat: 40.7357, lng: -74.1724 }, { name: "Jersey City", lat: 40.7178, lng: -74.0431 },
            { name: "Paterson", lat: 40.9168, lng: -74.1718 }, { name: "Elizabeth", lat: 40.6640, lng: -74.2107 },
            { name: "Edison", lat: 40.5187, lng: -74.4121 }, { name: "Woodbridge", lat: 40.5576, lng: -74.2846 },
            { name: "Lakewood", lat: 40.0763, lng: -74.2120 }, { name: "Toms River", lat: 39.9537, lng: -74.1979 },
            { name: "Hamilton", lat: 40.2170, lng: -74.7077 }, { name: "Clifton", lat: 40.8584, lng: -74.1638 }
        ],
        "New Mexico": [
            { name: "Albuquerque", lat: 35.0844, lng: -106.6504 }, { name: "Las Cruces", lat: 32.3199, lng: -106.7637 },
            { name: "Rio Rancho", lat: 35.2328, lng: -106.6630 }, { name: "Santa Fe", lat: 35.6870, lng: -105.9378 },
            { name: "Roswell", lat: 33.3943, lng: -104.5230 }, { name: "Farmington", lat: 36.7281, lng: -108.2187 },
            { name: "Clovis", lat: 34.4048, lng: -103.2052 }, { name: "Hobbs", lat: 32.7026, lng: -103.1360 },
            { name: "Alamogordo", lat: 32.8995, lng: -105.9603 }, { name: "Carlsbad", lat: 32.4207, lng: -104.2288 }
        ],
        "New York": [
            { name: "New York City", lat: 40.7128, lng: -74.0060 }, { name: "Buffalo", lat: 42.8802, lng: -78.8787 },
            { name: "Yonkers", lat: 40.9312, lng: -73.8987 }, { name: "Rochester", lat: 43.1566, lng: -77.6088 },
            { name: "Syracuse", lat: 43.0481, lng: -76.1474 }, { name: "Albany", lat: 42.6526, lng: -73.7562 },
            { name: "New Rochelle", lat: 40.9115, lng: -73.7824 }, { name: "Mount Vernon", lat: 40.9126, lng: -73.8371 },
            { name: "Schenectady", lat: 42.8142, lng: -73.9396 }, { name: "Utica", lat: 43.1009, lng: -75.2327 }
        ],
        "North Carolina": [
            { name: "Charlotte", lat: 35.2271, lng: -80.8431 }, { name: "Raleigh", lat: 35.7796, lng: -78.6382 },
            { name: "Greensboro", lat: 36.0726, lng: -79.7920 }, { name: "Durham", lat: 35.9940, lng: -78.8986 },
            { name: "Winston-Salem", lat: 36.0999, lng: -80.2442 }, { name: "Fayetteville", lat: 35.0527, lng: -78.8784 },
            { name: "Cary", lat: 35.7915, lng: -78.7811 }, { name: "Wilmington", lat: 34.2104, lng: -77.8868 },
            { name: "High Point", lat: 35.9557, lng: -80.0053 }, { name: "Concord", lat: 35.4088, lng: -80.5816 }
        ],
        "North Dakota": [
            { name: "Fargo", lat: 46.8772, lng: -96.7898 }, { name: "Bismarck", lat: 46.8083, lng: -100.7837 },
            { name: "Grand Forks", lat: 47.9253, lng: -97.0329 }, { name: "Minot", lat: 48.2330, lng: -101.2923 },
            { name: "West Fargo", lat: 46.8750, lng: -96.9004 }, { name: "Williston", lat: 48.1470, lng: -103.6180 },
            { name: "Dickinson", lat: 46.8792, lng: -102.7896 }, { name: "Mandan", lat: 46.8267, lng: -100.8896 },
            { name: "Jamestown", lat: 46.9105, lng: -98.7084 }, { name: "Wahpeton", lat: 46.2652, lng: -96.6059 }
        ],
        "Ohio": [
            { name: "Columbus", lat: 39.9612, lng: -82.9988 }, { name: "Cleveland", lat: 41.4993, lng: -81.6944 },
            { name: "Cincinnati", lat: 39.1031, lng: -84.5120 }, { name: "Toledo", lat: 41.6528, lng: -83.5379 },
            { name: "Akron", lat: 41.0814, lng: -81.5190 }, { name: "Dayton", lat: 39.7589, lng: -84.1916 },
            { name: "Parma", lat: 41.4048, lng: -81.7226 }, { name: "Canton", lat: 40.7989, lng: -81.3784 },
            { name: "Lorain", lat: 41.4528, lng: -82.1824 }, { name: "Hamilton", lat: 39.3995, lng: -84.5613 }
        ],
        "Oklahoma": [
            { name: "Oklahoma City", lat: 35.4676, lng: -97.5164 }, { name: "Tulsa", lat: 36.1540, lng: -95.9928 },
            { name: "Norman", lat: 35.2226, lng: -97.4395 }, { name: "Broken Arrow", lat: 36.0365, lng: -95.7810 },
            { name: "Edmond", lat: 35.6528, lng: -97.4781 }, { name: "Lawton", lat: 34.6059, lng: -98.3954 },
            { name: "Moore", lat: 35.3395, lng: -97.4867 }, { name: "Midwest City", lat: 35.4495, lng: -97.3967 },
            { name: "Enid", lat: 36.3956, lng: -97.8784 }, { name: "Stillwater", lat: 36.1156, lng: -97.0584 }
        ],
        "Oregon": [
            { name: "Portland", lat: 45.5152, lng: -122.6784 }, { name: "Salem", lat: 44.9429, lng: -123.0351 },
            { name: "Eugene", lat: 44.0521, lng: -123.0868 }, { name: "Gresham", lat: 45.4998, lng: -122.4312 },
            { name: "Hillsboro", lat: 45.5229, lng: -122.9898 }, { name: "Bend", lat: 44.0582, lng: -121.3153 },
            { name: "Beaverton", lat: 45.4871, lng: -122.8037 }, { name: "Medford", lat: 42.3265, lng: -122.8756 },
            { name: "Springfield", lat: 44.0462, lng: -123.0220 }, { name: "Corvallis", lat: 44.5646, lng: -123.2620 }
        ],
        "Pennsylvania": [
            { name: "Philadelphia", lat: 39.9526, lng: -75.1652 }, { name: "Pittsburgh", lat: 40.4406, lng: -79.9959 },
            { name: "Allentown", lat: 40.6023, lng: -75.4714 }, { name: "Erie", lat: 42.1292, lng: -80.0851 },
            { name: "Reading", lat: 40.3356, lng: -75.9269 }, { name: "Scranton", lat: 41.4087, lng: -75.6624 },
            { name: "Bethlehem", lat: 40.6259, lng: -75.3705 }, { name: "Lancaster", lat: 40.0379, lng: -76.3055 },
            { name: "Harrisburg", lat: 40.2732, lng: -76.8867 }, { name: "York", lat: 39.9626, lng: -76.7277 }
        ],
        "Rhode Island": [
            { name: "Providence", lat: 41.8240, lng: -71.4128 }, { name: "Warwick", lat: 41.7001, lng: -71.4162 },
            { name: "Cranston", lat: 41.7798, lng: -71.4373 }, { name: "Pawtucket", lat: 41.8787, lng: -71.3826 },
            { name: "East Providence", lat: 41.8137, lng: -71.3701 }, { name: "Woonsocket", lat: 42.0029, lng: -71.5148 },
            { name: "Coventry", lat: 41.6702, lng: -71.5815 }, { name: "Cumberland", lat: 41.9659, lng: -71.4323 },
            { name: "North Providence", lat: 41.8509, lng: -71.4648 }, { name: "South Kingstown", lat: 41.4402, lng: -71.5193 }
        ],
        "South Carolina": [
            { name: "Charleston", lat: 32.7765, lng: -79.9311 }, { name: "Columbia", lat: 34.0007, lng: -81.0348 },
            { name: "North Charleston", lat: 32.8546, lng: -79.9748 }, { name: "Mount Pleasant", lat: 32.7941, lng: -79.8626 },
            { name: "Rock Hill", lat: 34.9249, lng: -81.0251 }, { name: "Greenville", lat: 34.8526, lng: -82.3940 },
            { name: "Summerville", lat: 33.0185, lng: -80.1756 }, { name: "Goose Creek", lat: 32.9810, lng: -80.0326 },
            { name: "Sumter", lat: 33.9204, lng: -80.3415 }, { name: "Florence", lat: 34.1954, lng: -79.7626 }
        ],
        "South Dakota": [
            { name: "Sioux Falls", lat: 43.5460, lng: -96.7313 }, { name: "Rapid City", lat: 44.0805, lng: -103.2310 },
            { name: "Aberdeen", lat: 45.4647, lng: -98.4865 }, { name: "Brookings", lat: 44.3114, lng: -96.7984 },
            { name: "Watertown", lat: 44.9000, lng: -97.1141 }, { name: "Mitchell", lat: 43.7091, lng: -98.0298 },
            { name: "Yankton", lat: 42.8711, lng: -97.3973 }, { name: "Pierre", lat: 44.3683, lng: -100.3510 },
            { name: "Huron", lat: 44.3594, lng: -98.2134 }, { name: "Spearfish", lat: 44.4908, lng: -103.8594 }
        ],
        "Tennessee": [
            { name: "Nashville", lat: 36.1627, lng: -86.7816 }, { name: "Memphis", lat: 35.1495, lng: -90.0490 },
            { name: "Knoxville", lat: 35.9606, lng: -83.9207 }, { name: "Chattanooga", lat: 35.0456, lng: -85.3097 },
            { name: "Clarksville", lat: 36.5298, lng: -87.3595 }, { name: "Murfreesboro", lat: 35.8456, lng: -86.3903 },
            { name: "Franklin", lat: 35.9251, lng: -86.8689 }, { name: "Jackson", lat: 35.6145, lng: -88.8139 },
            { name: "Johnson City", lat: 36.3134, lng: -82.3535 }, { name: "Bartlett", lat: 35.2145, lng: -89.8273 }
        ],
        "Texas": [
            { name: "Houston", lat: 29.7604, lng: -95.3698 }, { name: "San Antonio", lat: 29.4241, lng: -98.4936 },
            { name: "Dallas", lat: 32.7767, lng: -96.7970 }, { name: "Austin", lat: 30.2672, lng: -97.7431 },
            { name: "Fort Worth", lat: 32.7254, lng: -97.3208 }, { name: "El Paso", lat: 31.7619, lng: -106.4850 },
            { name: "Arlington", lat: 32.7357, lng: -97.1081 }, { name: "Corpus Christi", lat: 27.8006, lng: -97.3964 },
            { name: "Plano", lat: 33.0198, lng: -96.6989 }, { name: "Laredo", lat: 27.5306, lng: -99.4803 }
        ],
        "Utah": [
            { name: "Salt Lake City", lat: 40.7608, lng: -111.8910 }, { name: "West Valley City", lat: 40.6916, lng: -111.9805 },
            { name: "Provo", lat: 40.2338, lng: -111.6585 }, { name: "West Jordan", lat: 40.6097, lng: -111.9391 },
            { name: "Orem", lat: 40.2969, lng: -111.6946 }, { name: "Sandy", lat: 40.5720, lng: -111.8599 },
            { name: "Ogden", lat: 41.2230, lng: -111.9738 }, { name: "St. George", lat: 37.0965, lng: -113.5684 },
            { name: "Layton", lat: 41.0602, lng: -111.9711 }, { name: "South Jordan", lat: 40.5622, lng: -111.9297 }
        ],
        "Vermont": [
            { name: "Burlington", lat: 44.4759, lng: -73.2121 }, { name: "South Burlington", lat: 44.4670, lng: -73.1710 },
            { name: "Rutland", lat: 43.6106, lng: -72.9726 }, { name: "Barre", lat: 44.1970, lng: -72.5020 },
            { name: "Montpelier", lat: 44.2601, lng: -72.5754 }, { name: "Winooski", lat: 44.4920, lng: -73.1857 },
            { name: "St. Albans", lat: 44.8109, lng: -73.0832 }, { name: "Newport", lat: 44.9367, lng: -72.2045 },
            { name: "Vergennes", lat: 44.1664, lng: -73.2532 }, { name: "Brattleboro", lat: 42.8509, lng: -72.5579 }
        ],
        "Virginia": [
            { name: "Virginia Beach", lat: 36.8529, lng: -75.9780 }, { name: "Chesapeake", lat: 36.7184, lng: -76.2467 },
            { name: "Norfolk", lat: 36.8508, lng: -76.2859 }, { name: "Richmond", lat: 37.5407, lng: -77.4360 },
            { name: "Newport News", lat: 36.9786, lng: -76.4280 }, { name: "Alexandria", lat: 38.8048, lng: -77.0469 },
            { name: "Hampton", lat: 37.0299, lng: -76.3452 }, { name: "Roanoke", lat: 37.2710, lng: -79.9414 },
            { name: "Portsmouth", lat: 36.8354, lng: -76.2983 }, { name: "Suffolk", lat: 36.7282, lng: -76.5836 }
        ],
        "Washington": [
            { name: "Seattle", lat: 47.6062, lng: -122.3321 }, { name: "Spokane", lat: 47.6588, lng: -117.4260 },
            { name: "Tacoma", lat: 47.2529, lng: -122.4443 }, { name: "Vancouver", lat: 45.6280, lng: -122.6739 },
            { name: "Bellevue", lat: 47.6101, lng: -122.2015 }, { name: "Kent", lat: 47.3809, lng: -122.2348 },
            { name: "Everett", lat: 47.9790, lng: -122.2021 }, { name: "Renton", lat: 47.4829, lng: -122.2171 },
            { name: "Yakima", lat: 46.6021, lng: -120.5059 }, { name: "Spokane Valley", lat: 47.6732, lng: -117.2394 }
        ],
        "West Virginia": [
            { name: "Charleston", lat: 38.3498, lng: -81.6326 }, { name: "Huntington", lat: 38.4192, lng: -82.4452 },
            { name: "Morgantown", lat: 39.6295, lng: -79.9559 }, { name: "Parkersburg", lat: 39.2667, lng: -81.5615 },
            { name: "Wheeling", lat: 40.0640, lng: -80.7209 }, { name: "Weirton", lat: 40.4189, lng: -80.5895 },
            { name: "Fairmont", lat: 39.4851, lng: -80.1426 }, { name: "Martinsburg", lat: 39.4562, lng: -77.9639 },
            { name: "Beckley", lat: 37.7782, lng: -81.1882 }, { name: "Clarksburg", lat: 39.2806, lng: -80.3445 }
        ],
        "Wisconsin": [
            { name: "Milwaukee", lat: 43.0389, lng: -87.9065 }, { name: "Madison", lat: 43.0731, lng: -89.4012 },
            { name: "Green Bay", lat: 44.5133, lng: -88.0133 }, { name: "Kenosha", lat: 42.5847, lng: -87.8212 },
            { name: "Racine", lat: 42.7261, lng: -87.7829 }, { name: "Appleton", lat: 44.2619, lng: -88.4154 },
            { name: "Waukesha", lat: 43.0117, lng: -88.2315 }, { name: "Eau Claire", lat: 44.8113, lng: -91.4985 },
            { name: "Oshkosh", lat: 44.0247, lng: -88.5426 }, { name: "Janesville", lat: 42.6828, lng: -89.0187 }
        ],
        "Wyoming": [
            { name: "Cheyenne", lat: 41.1400, lng: -104.8202 }, { name: "Casper", lat: 42.8666, lng: -106.3131 },
            { name: "Laramie", lat: 41.3114, lng: -105.5911 }, { name: "Gillette", lat: 44.2911, lng: -105.5022 },
            { name: "Rock Springs", lat: 41.5872, lng: -109.2029 }, { name: "Sheridan", lat: 44.7972, lng: -106.9562 },
            { name: "Green River", lat: 41.5286, lng: -109.4662 }, { name: "Evanston", lat: 41.2683, lng: -110.9632 },
            { name: "Riverton", lat: 43.0250, lng: -108.3802 }, { name: "Jackson", lat: 43.4799, lng: -110.7624 }
        ]
    }
};
