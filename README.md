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
var seeder = require('mongoose-seeder')(mongoose),
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
Unlike the original package mongoose-seeder, mais-mongoose-seeder returns promise and do not accept any callbacks. TO work with it use  than/catch.


### Behaviour

You can also provide extra options that will indicate if the drop strategy. You can choose if the library should drop
the entire database before seeding it again. Another option is to only drop the collections that are being seeded. This
offers the flexibility that you can manually add data to the database that keeps persisted. The third option is to do
nothing and just add the data to the collections. The default behaviour is to drop the entire database before seeding.

### .json

#### Simple data

How does a json file looks like? Take a look at this simple example.

```json
{
    "users": {
        "_model": "User",
        "foo": {
            "firstName": "Foo",
            "name": "Bar",
            "email": "foo@bar.com"
        }
    }
}
```

It will try to find the mongoose model ```User``` and calls the ```create``` method for the foo object.

The reason that this isn't an array of items, is because in the callback method, the second parameter returns the database object. This
will look like this.

```json
{
    "users": {
        "foo": {
            "_id": "550192679a3c881f4e7dc526",
            "__v": 0,
            "firstName": "Foo",
            "name": "Bar",
            "email": "foo@bar.com"
        }
    }
}
```

So the foo user can be accessed as following.

```JavaScript
    // Drop the entire database (default behaviour)
    seeder.seed(data, {dropCollections: true}).then(dbData => {
        var foo = dbData.users.foo;
    });
```

#### References

Most of the time, you have documents that have a reference to another document or to properties from another
document. It is possible to do that with this library.

```json
{
    "users": {
        "_model": "User",
        "foo": {
            "firstName": "Foo",
            "name": "Bar",
            "email": "foo@bar.com",
            "hobbies": [
                "cycling",
                "swimming"
            ]
        }
    },
    "teams": {
        "_model": "Team",
        "teamA": {
            "name": "Team A",
            "users": [
                {
                    "user": "->users.foo",
                    "email": "->users.foo.email",
                    "hobies": "->users.foo.hobbies"
                }
            ]
        }
    }
}
```

A team holds a list of users with the ```_id``` and the ```email``` of that user. Notice that writing ```->users.foo``` is identical
to writing ```->users.foo._id```.

Another thing that should be taken into account is that it's not possible to do a forward reference. This means that in this case,
a user cannot reference a team. The reason for this is that at the time the user is being created, the team does not yet exist. This
would be a nice feature for the future.

#### Expressions

Sometimes you will need something as an expression, for instance to set the birthday of the user.

```json
{
    "users": {
        "_model": "User",
        "foo": {
            "firstName": "Foo",
            "name": "Bar",
            "email": "foo@bar.com",
            "birthday": "=new Date(1988, 08, 16)"
        }
    }
}
```

Every statement that is preceded by an ```=```-sign will be evaluated by the native ```eval()``` method of JavaScript.

We can also bring it a step further and reference to the object itself. For instance, if we want to store the full name of
the user aswell, instead of adding it manually, you can do something like this.

```json
{
    "users": {
        "_model": "User",
        "foo": {
            "firstName": "Foo",
            "name": "Bar",
            "fullName": "=this.firstName + ' ' + this.lastName",
            "email": "foo@bar.com",
            "birthday": "=new Date(1988, 08, 16)"
        }
    }
}
```

The result of the ```fullName``` expression will be ```Foo Bar```. So every evaluation is evaluated in it's own context.

#### Dependencies

What if we don't want to make use of the plain old ```Date``` object, but instead use something like ```moment```. This is possible by
adding a list of dependencies.

```json
{
    "_dependencies": {
        "moment": "moment"
    },
    "users": {
        "_model": "User",
        "foo": {
            "firstName": "Foo",
            "name": "Bar",
            "email": "foo@bar.com",
            "birthday": "=moment('1988-08-16')"
        }
    }
}
```

If you are using a dependency in your json file, be sure to install it as dependency in your project. If not, it will stop the execution
and return a ```MODULE_NOT_FOUND``` error in the callback function.

## For more detail see the original project [mongoose-seeder](https://github.com/SamVerschueren/mongoose-seeder)


## Contributors

- Sam Verschueren (Author) [<sam.verschueren@gmail.com>]
- Max Eremin (Support) [<eremin_my@outlook.com>]


## License

MIT © Max Eremin
