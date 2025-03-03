build : 
	docker build -t tgbotit

run : 
	docker run -d -p 3000:3000 --name tgbotit --rm tgbotit