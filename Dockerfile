FROM ubuntu:20.04
RUN apt-get update && apt-get install -y \
    software-properties-common \ 
    curl
RUN curl -fsSL https://deb.nodesource.com/setup_14.x | bash -
RUN apt-get install -y nodejs
RUN add-apt-repository universe
RUN add-apt-repository ppa:deadsnakes/ppa
RUN apt-get update && apt-get install -y \
  python \
  python3-pip
RUN apt-get update && apt-get install -y \
  python3-distutils \ 
  python3-setuptools
RUN python3 -m pip install pip --upgrade pip
RUN pip3 install openai
RUN pip3 install sendgrid
RUN pip3 install seaborn
RUN pip3 install matplotlib
RUN pip3 install pandas
RUN pip3 install fpdf
RUN python3 --version
RUN pip3 --version
WORKDIR /webchat-botservice
COPY . /webchat-botservice
RUN npm install
EXPOSE 3202
CMD npm run start-web;
