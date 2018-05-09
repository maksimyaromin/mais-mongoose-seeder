# mais-mongoose-seeder

I made this package for academic purposes and it is based on Sam Verschueren's [mongoose-seeder](https://github.com/SamVerschueren/mongoose-seeder) package. It happened so that I have use Sam’s package which doesn’t work with current mongoose version. So, I decided to refactor it so that it can work with most mongoose versions as users need. And also, I deleted all the dependencies from the package so that no half npm is installed at the same time. 

### Thanks to Sam for his great job! He wrote one perfect package in 2015.
I do not in any way pretend to be authorship, since what I did it is basically just a refactoring. But I post this package in open access in case there is a need for someone else to use the mongoose-seeder package.

This library offers a nice, clean and elegant solution that will create the dummy data objects from a JSON file.

## Install

```
npm install mais-mongoose-seeder
```

## How to use

```js
var mongoose = require("mongoose");
// ...
var seeder = require('mais-mongoose-seeder')(mongoose),
    data = require('./data.json');
// connect all models to mongoose
// do all the things you may need
// and when there is time for test data download
// you write
seeder.seed(data).then(function(dbData) {
    // The database objects are stored in dbData
}).catch(function(err) {
    // handle error
});
```

### Important
Unlike the original package mongoose-seeder, mais-mongoose-seeder returns promise and do not accept any callbacks. To work with it use then/catch.

If you want use indexes, you can use mongoose { autoIndex: false } and ensure all indexes before or after seeding the data.
```js
    mongoose.connect(`mongodb://localhost:27017/${namespace}`, { autoIndex: false })
        .then(() => {
            return Model.ensureIndexes();
        })
        .then(() => {
            return seeder.seed(data);
        });
```

## For more detail see the original project [mongoose-seeder](https://github.com/SamVerschueren/mongoose-seeder)


## Contributors

- Sam Verschueren (Author) [<sam.verschueren@gmail.com>]
- Max Eremin (Support) [<eremin_my@outlook.com>]


## License

MIT © Max Eremin
