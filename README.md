# Brad Myers's Advisee Tree

At the [ACM CHI 2017](https://chi2017.acm.org) conference, [Brad Myers](http://www.cs.cmu.edu/~bam/) was awarded the [CHI Lifetime Research Award](https://sigchi.org/awards/sigchi-award-recipients/2017-sigchi-awards/#brad-a-myers).

The [original hierarchical document](https://docs.google.com/document/d/1NKheBhylXdkY_lmcV1QEP7CCLiwpMjE2L-KnWWh0Nvo/edit#heading=h.h4g51lbmhlnj) with affiliations, and the [visualized data](https://github.com/fredhohman/brad-myers-advisee-tree/blob/master/static/data.csv), are available.

*Designed by [Fred Hohman](http://fredhohman.com) (gen. 5), [Robert Pienta](http://www.cc.gatech.edu/~rpienta3/) (gen. 5), and [Polo Chau](http://www.cc.gatech.edu/~dchau/) (gen. 4).*

**[View the interactive visualization here!](http://fredhohman.com/brad-myers-advisee-tree)**

## Updating the data

1. Download the [Google Doc](https://docs.google.com/document/d/1NKheBhylXdkY_lmcV1QEP7CCLiwpMjE2L-KnWWh0Nvo/edit#heading=h.h4g51lbmhlnj) as Markdown into `data/`
2. From the `data/` folder, run:
```sh
python parse.py
```
This writes the output to `static/data.csv`.

## Development

```sh
npm install
npm run dev
```

## Building

```sh
npm run build
```
