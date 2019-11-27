/*
  Chrome Extension:
  UCLA BruinWalk Professor Ratings - Easy Access
  Version: 0.0.8
  Created by: Robert Ursua
              robertursuadev@gmail.com
              robertursua@yahoo.com

              and

              Preetham
              https://github.com/preethamrn

*/

// ** FUNCTIONS for sa.ucla.edu pages aka class searches in catalog ** //
let timeout = null;
document.addEventListener(
  "DOMSubtreeModified",
  () => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(listener, 1000);
  },
  false
);

// this is called whenever DOM is modifies
function listener() {
  // run the script if it detects a class search page
  // console.log("something happend");
  const windowURL = `${window.location.href}`;
  if (windowURL.includes("sa.ucla.edu")) findExistingClasses();
}

//
function findExistingClasses() {
  const uclaClasses = document.getElementsByClassName("row-fluid class-title");
  const courseDepartment = document
    .getElementById("spanSearchResultsHeader")
    .textContent.match(/\(([^()]*)\)$/i)[1]
    .replace(/\s/g, "-");

  for (let i = 0; i < uclaClasses.length; i++) {
    const instCont = uclaClasses[i].getElementsByClassName("instructorColumn");
    let courseNumber = uclaClasses[i].getElementsByClassName("head")[0]
      .textContent;
    courseNumber = courseNumber.substring(0, courseNumber.indexOf(" "));
    const courseName = `${courseDepartment}-${courseNumber}`;

    for (let j = 1; j < instCont.length; j++) {
      // start from 1 because the first instructorColumn isn't an actual instructor
      if (!instCont[j].hasAttribute("buttons-added")) {
        instCont[j].setAttribute("buttons-added", "true");
        addInstButtons(instCont[j], courseName);
      }
    }
  }
}

// Function for adding the button next to instructor names
function addInstButtons(instCont, courseName) {
  // console.log(uclaClassObj.innerHTML);

  if (instCont.getElementsByClassName("inst-button-bwalk").length > 0) return;

  let insListStr = instCont.innerHTML;
  const instructorName = [];

  let numInst;

  // console.log(insListStr);

  // This block will parse all instructor names from instructor list
  // it finds all text between > and <
  for (numInst = 0; numInst < 10; numInst++) {
    const closeBrackets = insListStr.indexOf(">");
    const openBrackets = insListStr.substring(closeBrackets + 1).indexOf("<");

    // If end of instructor list is reached, exit
    if (openBrackets == -1) {
      break;
    }

    instructorName[numInst] = insListStr
      .substring(closeBrackets + 1)
      .substring(0, openBrackets);
    insListStr = insListStr
      .substring(closeBrackets + 1)
      .substring(openBrackets + 1);
    // console.log(instructorName[numInst]);
  }

  // / this removes all the instructor names. The way its tagged is kinda hard to work with
  // when adding new elements so idk. Or maybe i just didnt stackoverflow the right question :)
  // this conditional prevents the instructor table title from getting erased
  if (numInst) {
    while (instCont.firstChild) {
      instCont.removeChild(instCont.firstChild);
    }
  }

  // this re-adds the professor names, each between paragraph tags
  for (let i = 0; i < numInst; i++) {
    const pCont = document.createElement("p");
    $(pCont).append(instructorName[i].substring(0, 15));
    pCont.title = instructorName[i];

    // creates and adds the buttons!
    const bwalkButton = document.createElement("a");
    bwalkButton.className = "inst-button-bwalk";
    bwalkButton.setAttribute("inst-name", instructorName[i]);
    bwalkButton.setAttribute("course-name", courseName);

    // adds the average ratings data to the buttons! but only to real professors. Not TAs
    if (instructorName[i] != "TA") {
      pCont.appendChild(bwalkButton);
      getInstSearchRes(bwalkButton, instructorName[i]);
      // instCont.appendChild(pContForBut)
    }

    instCont.appendChild(pCont);
  }
}

// gets the search results page from bruin walk and
// sets the overall rating score for the professor.
function getInstSearchRes(bwalkButton) {
  const instructorName = bwalkButton.getAttribute("inst-name");
  const uriInstName = encodeURI(instructorName);
  bwalkButton.addEventListener("mouseout", instButtEvLisMOut(bwalkButton));

  // Communicated to background.js so that background.js can do an xmlHttpRequest
  // that goes around the cross domain restriction for this content script
  chrome.runtime.sendMessage(
    // JSON that's sent
    {
      method: "GET",
      action: "xhttp",
      url: `http://www.bruinwalk.com/search/?category=professors&q=${uriInstName}`,
      data: ""
    },
    // callback function after background.js replies
    responseHTML => {
      if (responseHTML != "error") {
        // turns HTML from response into DOM nodes assigned to temporary div
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = responseHTML.replace(
          /<script(.|\s)*?\/script>/g,
          ""
        );

        // the else handles empty search results
        if (tempDiv.getElementsByClassName("sr-info").length == 0) {
          bwalkButton.innerHTML = "N/A";
          bwalkButton.setAttribute("found-tag", "NOT_FOUND");
          bwalkButton.addEventListener(
            "mouseover",
            instButtEvLis(bwalkButton, false, tempDiv)
          );
          return;
        }

        const allNamesFromRes = tempDiv.getElementsByClassName("sr-info");
        for (let i = 0; i < allNamesFromRes.length; i++) {
          // Parse name, last name, first initial of professor from results
          let instNameFromRes = allNamesFromRes[i].innerHTML;
          instNameFromRes = instNameFromRes.substring(
            instNameFromRes.indexOf("h1>") + 3,
            instNameFromRes.indexOf("</h1")
          );

          // The replace fucntions remove punctations. The one at the end removes white space
          // the match tag gets the last word aka last name
          const instLastNameFromRes = instNameFromRes
            .replace(/[.,/#!$%^&*;:'{}=\-_`~()]/g, "")
            .match(/\s(\w+)$/)[0]
            .replace(/\s/g, "");
          const instFirstInFromRes = instNameFromRes.replace(
            /[.,/#!$%^&*;:'{}=\-_`~()]/g,
            ""
          )[0];

          // console.log("Comparing " + instFirstInFromRes +" "+instLastNameFromRes +" vs " + instructorName);
          // console.log(instructorName.substring(instructorName.indexOf(" ")+1)[0] + " vs " + instFirstInFromRes);

          // If last names and first initials match
          if (
            instructorName.substring(0, instructorName.indexOf(",")) ==
              instLastNameFromRes &&
            instructorName.substring(instructorName.indexOf(" ") + 1)[0] ==
              instFirstInFromRes
          ) {
            // console.log("MATCHED");
            bwalkButton.setAttribute("found-tag", instNameFromRes);

            // Gets overall rating and attaches it to the button
            let tempStr = tempDiv
              .getElementsByClassName("professor-result")
              [i].getElementsByClassName("rating")[0];
            tempStr = tempStr.innerHTML;
            const score = tempStr.substring(
              tempStr.indexOf(">") + 1,
              tempStr.indexOf("</")
            );
            bwalkButton.innerHTML = score;

            if (score < 2) {
              bwalkButton.className = "inst-button-bwalk inst-rating-bad";
            } else if (score > 3.5) {
              bwalkButton.className = "inst-button-bwalk inst-rating-good";
            }

            const seeMoreLink = tempDiv
              .getElementsByClassName("sr-info")
              [i].getElementsByClassName("see-more")[0];
            const instPageUrl = `http://www.bruinwalk.com${seeMoreLink.href.substring(
              seeMoreLink.href.indexOf("/professors")
            )}all`;
            bwalkButton.href = instPageUrl;
            bwalkButton.target = "_blank";
            bwalkButton.setAttribute("inst-all-page", instPageUrl);

            bwalkButton.addEventListener(
              "mouseover",
              instButtEvLis(bwalkButton)
            );
            return;
          }
          // console.log("Comparing " + instLastNameFromRes + " vs " + instructorName.replace(/[.,\/#!$%\^&\*;:'{}=\-_`~()]/g,""));
        }

        // if search results finds no match
        bwalkButton.innerHTML = "N/A";
        bwalkButton.setAttribute("found-tag", "NOT_FOUND");

        bwalkButton.addEventListener("mouseover", instButtEvLis(bwalkButton));
      }
    }
  );
}

// This returns a function for the addeventlisteners for the instructor buttons
// this function is whats called when the button is mouseovered
// This adds the popup thingy when the score button is mouseovered
// so that more details ratings can be seen SeemsGood
function instButtEvLis(instBut) {
  return function() {
    // If popover hasn't been loaded, load it
    const popupContainers = instBut.parentElement.getElementsByClassName(
      "inst-rating-popup-cont"
    );
    if (popupContainers.length == 0) {
      // if professor was found
      if (instBut.getAttribute("found-tag") != "NOT_FOUND") {
        // this uses backgroun.js to retrive the HTML text from the professors Overall ratings page
        chrome.runtime.sendMessage(
          // JSON that's sent
          {
            method: "GET",
            action: "xhttp",
            url: instBut.getAttribute("inst-all-page"),
            data: ""
          },
          responseHTML => {
            if (responseHTML != "error") {
              // loads html into temporary div
              const tempDiv = document.createElement("div");
              tempDiv.innerHTML = responseHTML.replace(
                /<script(.|\s)*?\/script>/g,
                ""
              );

              // creates pop-up container
              const popupCont = document.createElement("div");
              popupCont.className =
                "inst-rating-popup-cont show popover clickover fade bottom in";

              // popup proper
              const popup = document.createElement("div");
              popup.className = "inst-rating-popup popover-content";

              // Creates div for popup title
              const titleDiv = document.createElement("div");
              titleDiv.className = "inst-rating-title-div";
              titleDiv.append(
                `Showing Bruin Walk results for: ${instBut.getAttribute(
                  "found-tag"
                )}`
              );
              popup.appendChild(titleDiv);

              // Calls another function to create the ratings table for this professor
              const instRatingTable = createGenInstRatingTable(
                tempDiv.getElementsByClassName("rating row")
              );
              popup.appendChild(instRatingTable);

              // Calls another function to create the grade-distribution for this course, if available
              const classGradeDist = createClassGradeDist(instBut);
              popup.appendChild(classGradeDist);

              // Creates div for popup footer
              const footerDiv = document.createElement("div");
              footerDiv.className = "inst-rating-footer-div";
              footerDiv.append("Click to see full Bruin Walk page");
              popup.appendChild(footerDiv);

              popupCont.appendChild(popup);
              $(popupCont).insertAfter(instBut);
            }
          }
        );
      }

      //   if professor wasnt found at bruinwalk
      else {
        // creates pop-up container
        const popupCont = document.createElement("div");
        popupCont.className =
          "inst-rating-popup-cont show popover clickover fade bottom in";

        const popup = document.createElement("div");
        popup.className = "inst-rating-popup popover-content inst-nonexistent";

        // Creates div for popup title
        const titleDiv = document.createElement("div");
        titleDiv.className = "inst-rating-title-div-nf";
        titleDiv.append(
          "This professor cannot be found at BruinWalk. Click to see search results"
        );
        popup.appendChild(titleDiv);

        instBut.href = `http://www.bruinwalk.com/search/?category=professors&q=${encodeURI(
          instBut.getAttribute("inst-name")
        )}`;
        instBut.target = "_blank";

        popupCont.appendChild(popup);
        $(popupCont).insertAfter(instBut);
      }
    }
    // if details have already been loaded, no need to reload.
    // this also makes the popup appear when the button is mouseovered
    else {
      popupContainers[0].className =
        "inst-rating-popup-cont show popover clickover fade bottom in";

      const popups = instBut.parentElement.getElementsByClassName(
        "inst-rating-popup-cont"
      );
      for (let i = 1; i < popups.length; i++) {
        const popup = popups[i];
        popup.parentElement.removeChild(popup);
      }
    }
  };
}

// creates General instructor ratings from bwalk for popups
function createGenInstRatingTable(ratingRows) {
  const titles = [
    "Overall:",
    "Easiness:",
    "Workload:",
    "Clarity:",
    "Helpfulness:"
  ];

  const table = document.createElement("table");
  table.className = "inst-rating-table";
  for (let i = 0; i < ratingRows.length; i++) {
    const value = ratingRows[i].getElementsByClassName("value")[0].textContent;

    const row = document.createElement("tr");
    const td1 = document.createElement("td");
    const td2 = document.createElement("td");
    td1.append(titles[i]);
    td2.append(value);

    if (i % 2) row.style.backgroundColor = "#EAEAEA";
    row.appendChild(td1);
    row.appendChild(td2);
    table.appendChild(row);
  }

  if (ratingRows.length == 0) {
    const row = document.createElement("tr");
    const td = document.createElement("td");
    td.append("No ratings recorded");
    row.appendChild(td);
    table.appendChild(row);
  }

  return table;
}

// creates Grades table from bwalk for popups
function createClassGradeDist(instBut) {
  const instPageUrl = `http://www.bruinwalk.com/professors/${instBut
    .getAttribute("found-tag")
    .replace(/\s/g, "-")
    .toLowerCase()}/${instBut.getAttribute("course-name").toLowerCase()}/`;
  const gradesTable = document.createElement("table");
  gradesTable.className = "grades-dist-table";
  // this uses backgrouns.js to retrive the HTML text from the course page
  chrome.runtime.sendMessage(
    // JSON that's sent
    {
      method: "GET",
      action: "xhttp",
      url: instPageUrl,
      data: ""
    },
    responseHTML => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = responseHTML;

      const allScores = tempDiv.getElementsByClassName("graph-body");
      if (allScores.length > 0) {
        var titleRow = document.createElement("tr");
        titleRow.style.backgroundColor = "#3496E1";
        var titleCell = document.createElement("td");
        titleCell.className = "grades-dist-table-title-cell";
        titleCell.append("Grades for this course under this professor: ");
        titleCell.colSpan = "13";
        titleRow.appendChild(titleCell);
        gradesTable.appendChild(titleRow);

        const scoresString = allScores[0].getElementsByClassName(
          "bar-fill has-tip tip-left"
        );
        const scores = [];
        const grades = [
          "+",
          "A",
          "-",
          "+",
          "B",
          "-",
          "+",
          "C",
          "-",
          "+",
          "D",
          "-",
          "F"
        ];
        const row1 = document.createElement("tr");
        const row2 = document.createElement("tr");
        let maxScore = 0;

        for (let i = 0; i < scoresString.length; i++) {
          scores[i] = parseInt(scoresString[i].getAttribute("title"));
          if (scores[i] > maxScore) maxScore = scores[i];
        }

        for (let i = 0; i < scoresString.length; i++) {
          const td1 = document.createElement("td");
          td1.className = "grades-dist-bar-cell";

          const bar = document.createElement("div");
          bar.style.height = `${String(
            Math.floor((scores[i] / maxScore) * 30)
          )}px`;
          bar.style.width = "5px";
          bar.className = "grades-dist-bar";

          const topBar = document.createElement("div");
          topBar.style.height = `${String(
            35 - Math.floor((scores[i] / maxScore) * 30)
          )}px`;
          topBar.style.width = "5px";
          topBar.style.background = "#FFFFFF";

          td1.appendChild(topBar);
          td1.appendChild(bar);
          row1.appendChild(td1);

          const td2 = document.createElement("td");
          td2.className = "grades-dist-grade-label-cell";
          td2.append(grades[i]);
          row2.appendChild(td2);
        }
        gradesTable.appendChild(row1);
        gradesTable.appendChild(row2);
      }
      // the class doesn't have grades
      else {
        const titleRow = document.createElement("tr");
        const titleCell = document.createElement("td");
        titleRow.style.backgroundColor = "#3496E1";
        titleCell.className = "grades-dist-table-title-cell";
        titleCell.append("No grades recorded.");
        titleRow.appendChild(titleCell);
        gradesTable.appendChild(titleRow);
      }
    }
  );
  return gradesTable;
}

// Adds mouseout listener that makes popups disappear
function instButtEvLisMOut(instBut) {
  return function() {
    instBut.parentElement.getElementsByClassName(
      "inst-rating-popup-cont"
    )[0].className =
      "inst-rating-popup-cont hide popover clickover fade bottom in";

    const popups = instBut.parentElement.getElementsByClassName(
      "inst-rating-popup-cont"
    );
    for (let i = 1; i < popups.length; i++) {
      const popup = popups[i];
      popup.parentElement.removeChild(popup);
    }
  };
}
