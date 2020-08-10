// const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const inquirer = require('inquirer');
var parseString = require('xml2js').parseString;
require('dotenv').config();

// const shelf = 'to-read';
// const shelf = 'demo';
// const reeseArray = require('./reese.json');
let bookLonglist = [];
let finalArray = [];
const bookOutletDelay = 500;

let goodReadsRequestConfig = {
  method: 'get',
  url: 'https://www.goodreads.com/review/list?v=2',
  data: {
    'v': '2',
    'id': '',
    'shelf': '',
    'per_page': '200',
    'key': process.env.GOODREADS_API_KEY
  }
}

const questions = [
  {
    type: 'confirm',
    name: 'goodreads',
    message: 'Do you want to search for books from a Good Reads shelf?'
  },
  {
    type: 'input',
    name: 'json',
    message: "What is the name of the JSON file with books (don't include .json extension)?",
    when: (answers) => !answers.goodreads
  },
  {
    type: 'input',
    name: 'goodreads_id',
    message: "What is your Good Reads ID?",
    when: (answers) => answers.goodreads
  },
  {
    type: 'list',
    name: 'shelf',
    message: "What shelf do you want to search?",
    choices: ['Want to Read', 'Other'],
    when: (answers) => answers.goodreads_id,
    filter: (value) => filterResponse(value)
  },
  {
    type: 'input',
    name: 'shelf',
    message: "What is the name of the shelf?",
    when: (answers) => answers.goodreads_id && !answers.shelf
  }
]

const filterResponse = (response) => {
	switch(response) {
	  case 'Want to Read':
	    return 'to-read'
	    break;
	  default:
	    return
	}
}

inquirer
  .prompt(questions)
  .then(async answers => {
    if (!answers.goodreads) {
      bookLonglist = require(`./${answers.json}.json`);
    } else {
      goodReadsRequestConfig.data['id'] = answers.goodreads_id;
      goodReadsRequestConfig.data['shelf'] = answers.shelf;
      bookLonglist = await fetchGoodReadsList();
    }

    compareLists()
  })
  .catch(error => {
    console.log(error);
  });

const compareLists = async () => {
  try {
    let totalBooks = bookLonglist.length;

    // iterate through good reads array and searches book outlet for each book
    for (let [index, selectedBook] of bookLonglist.entries()) {
      console.log(`Searching ${index + 1} of ${totalBooks} books`)

      let matchedBookArray = await searchBookOutlet(index, selectedBook);

      // pushes matched items into final array if not null
      if (matchedBookArray) {
        finalArray.push(...matchedBookArray);
        continue
      } else {
        continue
      }
    }
    console.log("\nHere are your 'to read' books available at Book Outlet:\n")
    // console.log(finalArray)
    printResults(finalArray);
  } catch (error) {
    console.log(`ERROR AT: ${compareLists.name}`)
    console.log(error);
    return error;
  }
}

const fetchGoodReadsList = async () => {
  try {
    console.log("\nFetching 'To Read' shelf from Good Reads\n")
    const response = await axios(goodReadsRequestConfig);
    let processedResponse = processGoodReadsResponse(response);
    return processedResponse;
  } catch (error) {
    console.log(`ERROR AT: ${fetchGoodReadsList.name}`)

    if (error.response.status == 404) {
      throw "404: Check Good Reads ID";
    } else {
      throw error.message;
    }
  }
}

const processGoodReadsResponse = (response) => {
  let unprocessedResponse;
  // converts xml response to json with xml2js 
  parseString(response.data, (err, result) => {
    unprocessedResponse = result['GoodreadsResponse']['reviews']['0']['review'];
  });

  const processedResponse = unprocessedResponse.map(x => {
    return {
      title: x['book'][0]['title'][0],
      author: x['book'][0]['authors'][0]['author'][0]['name'][0]
    }
  })

  return processedResponse;
}

const searchBookOutlet = async (index, selectedBook) => {
  // encodes book and author URIs for book outlet search
  let bookURI = encodeURIComponent(selectedBook.title).replace(/%20/g, "+");
  let authorURI = encodeURIComponent(selectedBook.author).replace(/%20/g, "+");

  // performs search of book title
  let titleArray = await fetchBookOutletSearch(bookURI, 'Title');

  // delay to stop 'HTTP 429 Too Many Requests' error
  await delay(bookOutletDelay);

  let authorArray = [];

  // if results title results were found, search authors, else skip to next iteration (avoiding unnecessary searches)
  if (titleArray.length != 0) {
    authorArray = await fetchBookOutletSearch(authorURI, 'Author');
  } else {
    return null;
  }

  // filters through titles array to match with books from authors array
  return titleArray.filter((titleArrayBook) => {
    // returns true if title and author of books in two arrays match
    return authorArray.some((authorArrayBook) => {
      return (titleArrayBook.title == authorArrayBook.title) && (titleArrayBook.author == authorArrayBook.author);
    })
  })
}

const fetchBookOutletSearch = async (term, category) => {
  try {
    // search book outlet using book title / author
    // console.log(`https://bookoutlet.ca/Store/Browse?q=${term}&qf=${category}&size=24&sort=relevance_1&view=list`)
    const bookOutletResponse = await axios.get(`https://bookoutlet.ca/Store/Browse?q=${term}&qf=${category}&size=24&sort=relevance_1&view=list`)
    return processBookOutletResponse(bookOutletResponse);
  } catch (error) {
    console.log(`ERROR AT: ${fetchBookOutletSearch.name}`)
    console.log(error);
    return;
  }
}

const processBookOutletResponse = (response) => {
  // load scraped data into cheerio to manipulate
  const $ = cheerio.load(response.data);

  // create variable from the useful part of scraped data
  const info = $('div[itemtype="http://schema.org/Book"] > .col-9');

  const bookArray = [];

  // find all book titles from search
  info.find('a:first-child').each((i, el) => {
    let item = $(el).text();

    // creates initial element whilst adding title
    bookArray.push({
      title: item,
      author: '',
      price: '',
      url: `https://bookoutlet.ca${$(el).attr('href')}`
    })
  })

  // find all authors from search
  info.children("p:first-child").each((i, el) => {
    // removes children in first p tag, returning what's left
    let item = $(el).children().remove().end();
    // removes whitespace
    item = item.text().trim();

    // changes first / last name order
    let splitName = item.split(', ')
    let name = splitName.reverse().join(' ');

    bookArray[i].author = name;
  })
  // finds prices of book from search
  info.find("h6 > span:nth-child(2)").each((i, el) => {
    let item = $(el).text();
    // replace all but numbers and full stops
    item = item.replace(/[^0-9\.]+/g, "")
    bookArray[i].price = item;
  })
  return bookArray;
}

const printResults = (finalArray) => {
  finalArray.forEach((book) => {
    // print results into console with color formatting
    console.log(`\x1b[34m${book.title}\x1b[0m by \x1b[36m${book.author}\x1b[0m, \x1b[32m$${book.price}\x1b[0m \n\x1b[37m${book.url}\x1b[0m \n`)
  })

}

const delay = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}