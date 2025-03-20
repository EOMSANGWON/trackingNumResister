import React, {useCallback, useState} from "react";
import {useDropzone} from "react-dropzone";
import axios from 'axios';

function App() {
  const [files,setFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles)=>{
    // console.log(acceptedFiles);
    setFiles(acceptedFiles);
  },[]);

  const {getRootProps, getInputProps} = useDropzone({onDrop});
  const [responseData, setResponseData] = useState(null);


  const clickGetButton = async() =>{
    if (files.length === 0) {
      alert("파일을 먼저 선택하세요");
      return;
    } 

    const formData = new FormData();
    formData.append("file",files[0]);

    try {
      const response = await axios.post('http://localhost:5000/getContents', formData, {
        headers : {
          "Content-Type":"multipart/form-data",
        },
      });
      console.log("서버 응답:",response.data);
      setResponseData(response.data.data);

    } catch (error) {
      console.error("파일 업로드 실패:",error);
    }
  };

    const clickSendButton = async(trackingNum,productOrderId) => {
      try {
        const response = await axios.post('http://localhost:5000/sendPackages',{
          trackingNum, 
          productOrderId
        });
        alert(response.data["message"])
        console.log("서버 응답:",response.data);
     
      } catch (error) {
        console.error("발송처리 실패:",error);
      }
    };

  return (
    <div>
      <h1 className="text-4xl font-extrabold flex items-center justify-center py-6">운송장 자동 등록</h1>
      
      {files.length>0 ? 
       (
       <div>
        <div>
          <p className="text-lg flex py-2 px-3"> 선택된 파일 : {files.length >0 ? files[0].name : "파일을 선택하세요"}</p>
        </div>

          <div className="px-2">
            <button
              onClick={clickGetButton}
              className="bg-gray-300 py-1 px-2 my-5 rounded-lg text-black cursor-pointer">
              파일내용 불러오기 
            </button>
          </div>

          {/* 서버에서 받은 데이터를 화면에 표시 */}
          {responseData && (
                      <div>
                        <table className="w-full border-collapse border border-gray-300">
                          <thead>
                            <tr className = "bg-gray-100">
                              <th className="border">운송장번호</th>
                              <th className="border">고객주문번호</th>
                              <th className="border">상품주문번호</th>
                              <th className="border">발송처리</th>
                            </tr>
                          </thead>
                          <tbody>
                            {responseData.map((item, index) => (
                              <tr key={index} className="hover:bg-gray-50">
                                <td className="p-1 border border-gray-300 text-center">{item.운송장번호}</td>
                                <td className="p-1 border border-gray-300 text-center">{item.고객주문번호}</td>
                                <td className="p-1 border border-gray-300 text-center">{item.상품주문번호}</td>
                                <td className="p-1 border border-gray-300 text-center">
                                  <button 
                                    className = "bg-gray-200 px-4 rounded-lg font-bold"
                                    onClick={()=>clickSendButton(item.운송장번호, item.상품주문번호)}>
                                      발송
                                    </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

        </div>
        ) :  (
        <div {...getRootProps()} className="w-full h-80 border-4 border-dashed border-blue-500 flex items-center justify-center text-gray-700">
          <input {...getInputProps()} />
          <p className="font-bold text-xl">여기에 파일을 드래그하거나 클릭해서 업로드하세요</p>
        </div>
        )}
      
    </div>
  );
}

export default App;