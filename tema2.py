import string
articol = """
Într-o zi frumoasă de primăvară, oamenii se adună în parcuri pentru a se bucura de soare! 
Viața este plină de surprize, iar fiecare moment trebuie trăit la maximum.
"""
lungime = len(articol)
jumătate = lungime // 2
prima_parte = articol[:jumătate]
a_doua_parte = articol[jumătate:]


prima_parte = prima_parte.upper()

prima_parte = prima_parte.strip()



a_doua_parte = a_doua_parte[::-1]

a_doua_parte = a_doua_parte.capitalize()

a_doua_parte = a_doua_parte.translate(str.maketrans('', '', string.punctuation))


rezultat = prima_parte + ' ' + a_doua_parte


print(rezultat) 
