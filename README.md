# BookOutlet.ca Book Search

## Description
An app for searching the discount book site bookoutlet.ca for books from a GoodReads list or a user created JSON list.

## Usage
Run the app from the command line:
```
cd ../BookPrice
node app.js
```

### GoodReads list
To be able to fetch lists from GoodReads you will need to get an API key which should be added into the `goodReadsRequestConfig` object in app.js, under the key `key`. More information on getting an API key can be found here: https://www.goodreads.com/api.

You can find your GoodReads ID by navigating to one of your lists and looking for the number inbetween 'list' and your username, e.g:
 `https://www.goodreads.com/review/list/`**`94096085`**`-ben-unyolo?shelf=read`

After running the script you will be asked a few questions:
```bash
? Do you want to search for books from a Good Reads shelf? (Y/n)  # type 'y' for goodreads shelf

? What is your Good Reads ID? # type goodreads ID

? What shelf do you want to search? (Use arrow keys) # select whether you want to search 'Want to Read' shelf or another
❯ Want to Read 
  Other

# if not selecting 'Want to Read' shelf
? What is the name of the shelf? # type name of the shelf to search
```

### User created JSON list
You can also create your own list to search. Create a JSON file within the BookPrice folder in the following format:

```json
[
  {
    "title": "Nineteen–Eighty Four",
    "author": "George Orwell"
  },
  {
    "title": "To Kill a Mockingbird",
    "author": "Harper Lee"
  },
  {
    "title": "Pride and Prejudice",
    "author": "Jane Austen"
  }
]
```

After running the script you will be asked a few questions:
```bash
? Do you want to search for books from a Good Reads shelf? (Y/n)  # type 'n' for JSON list

What is the name of the JSON file with books? # type the name of the file without .json extension
```
