export default class LocalStorageHandler {
    constructor() {
        this.subjectsContainer = document.getElementById("welcomeScreen__subjectsContainer");
        this.savedNotes = document.getElementById("welcomeScreen__savedNotes") || document.getElementById("notesScreen__savedUnits");
        this.subjectWiseUnits = JSON.parse(localStorage.getItem("notes"));
        this.subjects = Object.keys(this.subjectWiseUnits);
        if (this.subjectsContainer) this.displaySubjects();
        if (this.savedNotes)
            this.initSavedNotes();
        this.logoutForm = document.getElementById("logoutForm");

        this.events();
    }

    //events

    events() {
        this.logoutForm.addEventListener("submit", (e) => {
            e.preventDefault();
            this.removeNotes();
        })
    }

    //methods

    //display subjects on the "welcome screen"
    displaySubjects() {


        console.log(this.subjectWiseUnits);

        this.subjects.forEach((subject) => {
            let firstUnit = this.subjectWiseUnits[subject].find((unit) => unit.unitNo == 1);
            this.subjectsContainer.insertAdjacentHTML("beforeend", `
                 <a href="${firstUnit.url}" class="btn btn--brand">${subject}</a>
            `)
        })
    }

    initSavedNotes() {
        //savedNoteContainers will contain those "input" with class "savedNoteId" fields via the welcome/notes.ejs 
        const savedNoteContainers = document.querySelectorAll(".savedNoteId");

        savedNoteContainers.forEach((savedNote) => {
            let savedNote_id = savedNote.value; //the "value" of "input" is the "noteId"

            //filter the "saved units" from overall available units
            this.subjects.map((subject) => {
                let savedNoteDetail = this.subjectWiseUnits[subject].find(unit => unit._id == savedNote_id);
                if (savedNoteDetail) {
                    savedNote.subject = savedNoteDetail.subject;
                    savedNote.url = savedNoteDetail.url;
                    savedNote.title = savedNoteDetail.title;
                }
            })
        })

        this.sortAndDisplaySavedNotes(savedNoteContainers);
    }

    sortAndDisplaySavedNotes(savedNotes) {
        let savedSubjects = {};
        Array.from(savedNotes).map((note) => {
            savedSubjects[note.subject] = 1;
        })
        let savedSubjectsArray = Object.keys(savedSubjects);
        let savedNoteContainers = [];
        savedSubjectsArray.forEach((subject) => {
            let savedNoteContainer = document.createElement("div");
            savedNoteContainer.setAttribute("class", "savedNoteContainer");
            savedNoteContainer.insertAdjacentHTML("beforeend", `<h5>${subject}</h5>`)
            savedNoteContainer.dataset.subject = subject;
            savedNoteContainers.push(savedNoteContainer);
            this.savedNotes.appendChild(savedNoteContainer);
        })
        savedNotes.forEach((savedNote) => {
            let associatedSubjectContainer = savedNoteContainers.find((container) => container.dataset.subject === savedNote.subject);
            associatedSubjectContainer.insertAdjacentHTML("beforeend", `
                <div class="savedNote">
                    <a href="${savedNote.url}">${savedNote.title}</a>
                </div>
            `)
        })

    }

    //remove "notes" from localStorage
    removeNotes() {
        localStorage.removeItem("notes");
        this.logoutForm.submit();
    }
}