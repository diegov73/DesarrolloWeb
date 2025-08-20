class people{
    constructor(name, password){
        this.name=name;
        this.password=password;
    }

    introduction(){
        return `welcome back ${this.name}!`;
    }
}

function submit(){
    let a = document.getElementById("name").value;
    let b = document.getElementById("password").value;

    const p1 = new people(a, b);

    if(a == "" || b == ""){
        document.getElementById("introduction").innerText = "you have to complete the submit";
    }

    else{
        document.getElementById("introduction").innerText = p1.introduction();
    }
}