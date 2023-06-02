/**
 * Differences from previous is the data is stored in big 1d array instead of
 * lots of nested small arrays as in prev. Benefits: 
 * - no need for recursion
 * - less memory consumption
 * - get() is faster for multiple elements bc no need for flat() (expensive)
 * 
 * Coordinates get converted to 1d array indices just like you would convert
 * a base-n number to a decimal number. For example, if we have 4 regions,
 * and the coordinate is something like [0, 3, 1, 2, 1], we can imagine it is
 * the base-4 number 12130 (digits made up from the reverse of the coordinate array)
 * and convert it to base 10 with 1*4^4 + 2*4^3 + 1*4^2 + 3*4^1 + 0*4^0. The
 * result is the index of that element in the 1d array
 * 
 * Every function (constructor, get, and put) is significantly faster than
 * previous version, especially the constructor and get. Also this model uses
 * half as much memory
 * 
 * the api is the same as before so it can just be a drop-in replacement
 * (i.e. all constructor, methods called in the same way)
 */

/*
Questions for Nikos:
- it seems like Hyperdex isn't dynamic bc the data lies on certain serves. How do we address which servers data lies on / 
how do we move data for patch.
- each server is a dimension, and regions are just partitions within the servers. how do we move data? is it a similar chaining mechanism?
- when we say that data changes do we mean the structure? (ie student data base also adds grade) or the data changes (john smith becomes john johnson)?
    - it seems like we mean both from my reading?
    - if so, how can we guarantee servers can support the load -- it seems like servers are kind of handling a lot at this point???
- if it is the structure what happens if the structure becomes too big (edge case below)
- what are our consistency guarantees?

Edge cases to consider:
- very small servers where multiple attributes would be hashed to the same value. (we couldn't even used a linked list to distinguish between values)
- just collisions i think???
*/

class DSSimple {

    // Constructor for the distributed system. User needs to pass in the number of dimensions, regions per
    // dimension, and the hashing function used to encrypt the values
	constructor(dims, regions, hashing_fun) {
		this.dims = dims;
		this.regions = regions;
        this.hashing_fun = hashing_fun;

		// For computing n-dim coordinates to 1-dim indices, we use powers of
		// `regions` a lot. Storing them in a lookup table yields significant 
		// performance improvements according to my testing
		// So whenever you see `this.LUT[i]`, just imagine it is saying `Math.pow(regions, i)`.
		this.LUT = new Array(dims);
		for(let i = 0; i < dims; i++) {
			this.LUT[i] = Math.pow(regions, i);
		}

		// allocate data as a big 1d array. we know its size to be regions^dims
		this.data = new Array(Math.pow(regions, dims));
		// initialize all slots to null. using for loop instead of .fill() gives
		// a measurable performance increase
		for(let i = 0; i < this.data.length; i++) this.data[i] = null;
	}

    // put function; user puts in an object -- object is used to created array of coordinates
    // -- object is put into the array with the value of the coordinates -- coordinates are returned
	put(value) {

        // hashing_fun = this.hashing_fun;
        // (coord = []).length = this.dim;
		let coord = []; // Declare and initialize the coord variable as an empty array
		// console.log(this.dims);
		coord.length = this.dims; // Set the length of the array to `this.dim`

        coord.fill(0);
		// console.log("received this value: ", value);
		// console.log("dims:", this.dims, "regions:", this.regions);
        for (let a in value){
			// console.log("Attribute", a, "Hashed:", this.hashing_fun(a) % this.dims, "value:", value[a], "hashed:", this.hashing_fun(value[a]) % this.regions);
            coord[(this.hashing_fun(a) % this.dims + this.dims) % this.dims] = ((this.hashing_fun(value[a]) % this.regions) + this.regions) % this.regions;
        }

		// console.log("coords", coord);

		let i = 0, idx = 0;
		// just convert the coord to base-10 as mentioned earlier and index into the
		// data array at that computed value

		while (i < this.dims) idx += coord[i] * this.LUT[i++];
		this.data[idx] = value;

		// console.log(this.data);

        return coord;
	}

    // user passes in the coordinates (with some spots that can be null) and is returned all
    // objects that match this description
	get(coord) {
		// This function probably still has room for improvement, perhaps we can
		// just allocate 2 arrays and swap between them instead of making a new Array
		// for each "any" of coord. But then we will be trading off memory usage for
		// speed

		// start with result array being just the single index, 0
		let res = [0];
		// iterate through elements of coord
		for(let i = 0; i < this.dims; i++) {
			if(coord[i] === null) {
				// Want to keep all possibilities in this dimension since coord was 'any'
				// pre-allocate the right amount of space here for the new res array.
				let tmp = new Array(res.length * this.regions);
				// for each elt of the old `res`, we store elt + k * regions^i for
				// k = 0..regions - 1
				for(let j = 0; j < res.length; j++) {
					for(let k = 0; k < this.regions; k++) {
						tmp[k + j * this.regions] = res[j] + k * this.LUT[i]; 
					}
				}
				res = tmp;
			} else {
				// If the coordinate at this dimension is a specific number x, just
				// add x*regions^i to all indices in res
				for(let j = 0; j < res.length; j++) res[j] += coord[i] * this.LUT[i];
			}
		}

		// We now have an array of indices of the stuff we want, now we change those
		// indices into actual stuff by indexing into data.
		// even when the type of data stored in `this.data` is not an integer,
		// I still found that reusing the res array instead of allocating space for
		// a new one and filling it in is much more performant
		for(let i = 0; i < res.length; i++) {
			res[i] = this.data[res[i]];
		}
		return res;
	}

    // i'm not sure what delete should take so I'll write it with coordinates for now -- will try to figure
    // out how to do it with object itself + I should figure out if this is sufficient to deleting objects
    delete(coord) {
		let i = 0, idx = 0;
		// just convert the coord to base-10 as mentioned earlier and index into the
		// data array at that computed value

		while (i < this.dims) idx += coord[i] * this.LUT[i++];
		this.data[idx] = null;
	}

    // patch takes in the old coordinate values, and the new object and replaces the old object with new object
    patch(old_coord, new_object){
        // this should remove the old object from the database
        this.delete(old_coord);
        return this.put(new_object);
    }

	// This returns a nested array equivalent to what the old version stored as
	// `data` internally. You can call .toNested() so its a bit easier to explore
	// e.g. if you console.log it out instead of just a giant 1d array
	toNested() {
		let res = this.data;
		for(let j = 0; j < this.dims - 1; j++) {
			// tmp will hold all the references from res, but split into chunks
			// (subarrays) of length `regions`. Then we assign tmp to res, and
			// chunk again and again; we just do this dims - 1 times to
			// get the fully nested array
			let tmp = [];
			for(let i = 0; i < res.length; i += this.regions) {
				tmp.push(res.slice(i, i + this.regions));
			}
			res = tmp;
		}
		return res;
	}
}

export {DSSimple as DSSimple};